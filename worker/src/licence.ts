import { FIRST_PILGRIMAGE_EVENTS, ORGANISER_PRODUCTS, PLANS, type Tier } from '../../src/core/engine/tiers';
import { isHex, openToken, sha256Hex, signToken, signer } from './crypto';
import type { Env } from './env';
import { googlePlay } from './play';

// Licences (section 10, DEC-016, DEC-034, DEC-035). The Worker checks each purchase with Google
// Play and signs a licence the app verifies offline; the private key never leaves the Worker.

const DAY = 86_400;
/** One purchase can be restored on up to this many identities (new phone, reinstall). */
const MAX_KEYS_PER_PURCHASE = 3;
const ORGANISER_DAYS = 30;

interface Product {
  tier: Exclude<Tier, 'free'>;
  kind: 'products' | 'subscriptions';
  days: number;
  members?: number;
}

export function product(productId: string): Product | null {
  const plan = PLANS.find((p) => p.productId === productId);
  if (plan && plan.tier !== 'free') return { tier: plan.tier, kind: plan.kind === 'subscription' ? 'subscriptions' : 'products', days: plan.days };
  const org = ORGANISER_PRODUCTS.find((p) => p.productId === productId);
  if (org) return { tier: 'organiser', kind: 'products', days: ORGANISER_DAYS, members: org.members };
  return null;
}

type Result = { status: number; body: Record<string, unknown> };
const fail = (status: number, error: string): Result => ({ status, body: { error } });

export async function redeemPurchase(env: Env, body: Record<string, unknown>, nowSec: number): Promise<Result> {
  const { productId, purchaseToken, signPk } = body;
  if (typeof productId !== 'string' || typeof purchaseToken !== 'string' || purchaseToken.length > 4096 || !isHex(signPk, 64)) return fail(400, 'bad_request');
  const p = product(productId);
  if (!p) return fail(400, 'unknown_product');

  const play = env.play ?? googlePlay(env.PACKAGE_NAME, env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const check = p.kind === 'subscriptions' ? await play.subscription(productId, purchaseToken) : await play.product(productId, purchaseToken);
  if (!check.ok) return fail(402, 'not_purchased');

  // Bind the purchase to a few identities so one token cannot unlock unlimited phones.
  const key = `pt:${await sha256Hex(purchaseToken)}`;
  const record = ((await env.KV.get(key, 'json')) as { productId: string; firstAt: number; subs: string[] } | null) ?? { productId, firstAt: nowSec, subs: [] };
  const sub = signPk.toLowerCase();
  if (!record.subs.includes(sub)) {
    if (record.subs.length >= MAX_KEYS_PER_PURCHASE) return fail(409, 'too_many_devices');
    record.subs.push(sub);
  }
  await env.KV.put(key, JSON.stringify(record));
  if (check.needsAck) await play.acknowledge(p.kind, productId, purchaseToken);

  // One-time passes run from the first redemption, so restoring later does not extend them.
  const exp = p.kind === 'subscriptions' ? check.expiresAt! : record.firstAt + p.days * DAY;
  if (exp <= nowSec) return fail(410, 'expired');
  const s = await signer(env.LICENCE_SIGNING_SEED);
  const licence = await signToken(s, {
    kind: 'licence',
    lid: key.slice(3, 19),
    tier: p.tier,
    sub,
    iat: nowSec,
    exp,
    product: productId,
    ...(p.members ? { members: p.members } : {}),
  });
  return { status: 200, body: { licence } };
}

/** Rule 3: one free 14-day Event Pass per identity for a first major pilgrimage. */
export async function firstPilgrimage(env: Env, body: Record<string, unknown>, nowSec: number): Promise<Result> {
  const { signPk, eventId } = body;
  if (!isHex(signPk, 64) || typeof eventId !== 'string' || !FIRST_PILGRIMAGE_EVENTS.includes(eventId)) return fail(400, 'bad_request');
  const sub = signPk.toLowerCase();
  const key = `fp:${await sha256Hex(sub)}`;
  if (await env.KV.get(key)) return fail(409, 'already_claimed');
  await env.KV.put(key, JSON.stringify({ eventId, at: nowSec }));
  const s = await signer(env.LICENCE_SIGNING_SEED);
  const licence = await signToken(s, { kind: 'licence', lid: `fp-${key.slice(3, 15)}`, tier: 'event_pass', sub, iat: nowSec, exp: nowSec + 14 * DAY, product: 'first_pilgrimage', eventId });
  return { status: 200, body: { licence } };
}

/** E8: an organiser licence holder gets a certificate for their per-event key. */
export async function organiserCert(env: Env, body: Record<string, unknown>, nowSec: number): Promise<Result> {
  const { licence, eventPk, eventId, name } = body;
  if (typeof licence !== 'string' || !isHex(eventPk, 64) || typeof eventId !== 'string' || !/^[a-z0-9-]{1,40}$/.test(eventId)) return fail(400, 'bad_request');
  if (typeof name !== 'string' || !name.trim() || [...name].length > 60) return fail(400, 'bad_name');
  const s = await signer(env.LICENCE_SIGNING_SEED);
  const lic = await openToken(s, licence);
  if (!lic || lic.kind !== 'licence' || lic.tier !== 'organiser' || typeof lic.exp !== 'number' || lic.exp <= nowSec) return fail(403, 'needs_organiser');
  const cert = await signToken(s, { kind: 'organiser_cert', pk: eventPk.toLowerCase(), name: name.trim(), eventId, exp: Math.min(lic.exp, nowSec + ORGANISER_DAYS * DAY), lid: lic.lid });
  return { status: 200, body: { cert } };
}
