import { COMMUNITY, freshTimestamp, postProblem, postSigningMessage, reportSigningMessage } from '../../src/core/engine/community';
import { EventPackSchema, MAX_PACK_BYTES } from '../../src/core/packs/schema';
import { b64, bytesToHex, fromB64, isHex, safeEqual, signer, utf8, verifyEd25519 } from './crypto';
import type { Env } from './env';
import { firstPilgrimage, organiserCert, redeemPurchase } from './licence';
import { syncProblem } from './mailbox';

// Routes (docs/setup.md lists them). The app talks to these only when it has internet; nothing in
// the safety path depends on them (CLAUDE.md rule 8).

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const MAX_BODY = 64 * 1024;

async function readJson(req: Request, limit = MAX_BODY): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > limit) return null;
  try {
    const v = JSON.parse(text) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function randomId(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(8)));
}

export async function route(req: Request, env: Env, nowMs = Date.now()): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  const nowSec = Math.floor(nowMs / 1000);
  const m = req.method;

  if (m === 'GET' && path === '/v1/health') return json(200, { ok: true });
  if (m === 'GET' && path === '/v1/licence/public-key') return json(200, { publicKey: (await signer(env.LICENCE_SIGNING_SEED)).publicKeyHex });

  // Licences (section 10).
  if (m === 'POST' && (path === '/v1/licence' || path === '/v1/licence/first-pilgrimage' || path === '/v1/organiser/cert')) {
    const body = await readJson(req);
    if (!body) return json(400, { error: 'bad_request' });
    const handler = path === '/v1/licence' ? redeemPurchase : path === '/v1/organiser/cert' ? organiserCert : firstPilgrimage;
    const r = await handler(env, body, nowSec);
    return json(r.status, r.body);
  }

  // Signed event packs (F2, DEC-031).
  const pack = path.match(/^\/v1\/packs\/([a-z0-9-]{1,40})\.(json|sig)$/);
  if (m === 'GET' && pack) {
    const v = await env.KV.get(`pack:${pack[1]}:${pack[2]}`);
    if (v === null) return json(404, { error: 'not_found' });
    return new Response(v, { headers: { 'content-type': pack[2] === 'json' ? 'application/json' : 'text/plain', 'cache-control': 'public, max-age=3600' } });
  }
  const admin = path.match(/^\/v1\/admin\/packs\/([a-z0-9-]{1,40})$/);
  if (m === 'PUT' && admin) {
    const auth = req.headers.get('authorization') ?? '';
    if (!env.ADMIN_TOKEN || !safeEqual(auth, `Bearer ${env.ADMIN_TOKEN}`)) return json(401, { error: 'unauthorized' });
    const body = await readJson(req, MAX_PACK_BYTES + 1024);
    const parsed = EventPackSchema.safeParse(body);
    if (!parsed.success || parsed.data.id !== admin[1]) return json(400, { error: 'invalid_pack' });
    const canonical = JSON.stringify(parsed.data);
    if (utf8(canonical).length > MAX_PACK_BYTES) return json(413, { error: 'too_large' });
    const sig = b64(await (await signer(env.LICENCE_SIGNING_SEED)).sign(utf8(canonical)));
    await env.KV.put(`pack:${admin[1]}:json`, canonical);
    await env.KV.put(`pack:${admin[1]}:sig`, sig);
    return json(200, { id: admin[1], version: parsed.data.version });
  }

  // Family Circle mailbox (G6).
  if (m === 'POST' && path === '/v1/circle/sync') {
    const body = await readJson(req, 1024 * 1024);
    if (!body || !isHex(body.mailbox, 32) || syncProblem(body)) return json(400, { error: 'bad_request' });
    const stub = env.MAILBOX.get(env.MAILBOX.idFromName((body.mailbox as string).toLowerCase()) as never);
    return json(200, await stub.sync({ cursor: body.cursor as string, packets: body.packets as string[] }, nowMs));
  }

  // Event communities (G7).
  const comm = path.match(/^\/v1\/community\/([a-z0-9-]{1,40})\/(posts|report)$/);
  if (comm) {
    const eventId = comm[1]!;
    const stub = env.COMMUNITY.get(env.COMMUNITY.idFromName(eventId) as never);
    if (m === 'GET' && comm[2] === 'posts') return json(200, { posts: await stub.list(nowMs) });
    if (m !== 'POST') return json(405, { error: 'method' });
    const body = await readJson(req);
    if (!body || !isHex(body.pk, 64) || typeof body.sig !== 'string' || typeof body.ts !== 'number' || !freshTimestamp(body.ts, nowSec)) return json(400, { error: 'bad_request' });
    const pk = (body.pk as string).toLowerCase();
    let sig: Uint8Array;
    try {
      sig = fromB64(body.sig);
    } catch {
      return json(400, { error: 'bad_signature' });
    }
    if (comm[2] === 'posts') {
      const text = typeof body.text === 'string' ? body.text : '';
      const city = typeof body.city === 'string' ? body.city : '';
      if (postProblem(text, city)) return json(400, { error: postProblem(text, city) });
      const message = postSigningMessage({ eventId, pk: body.pk as string, city, text, ts: body.ts });
      if (!(await verifyEd25519(pk, utf8(message), sig))) return json(403, { error: 'bad_signature' });
      const r = await stub.post({ id: randomId(), author: pk, text: text.trim(), city: city.trim(), at: nowMs });
      return r === 'ok' ? json(200, { ok: true }) : json(429, { error: r, retryAfterSec: 3600 / COMMUNITY.postsPerHour });
    }
    if (typeof body.postId !== 'string' || !/^[0-9a-f]{16}$/.test(body.postId)) return json(400, { error: 'bad_request' });
    const message = reportSigningMessage({ eventId, pk: body.pk as string, postId: body.postId, ts: body.ts });
    if (!(await verifyEd25519(pk, utf8(message), sig))) return json(403, { error: 'bad_signature' });
    const r = await stub.report(body.postId, pk);
    return r === 'not_found' ? json(404, { error: r }) : json(200, { ok: true });
  }

  return json(404, { error: 'not_found' });
}
