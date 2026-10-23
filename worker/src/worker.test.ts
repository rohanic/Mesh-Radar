import { postSigningMessage, reportSigningMessage } from '../../src/core/engine/community';
import { addPost, listPosts, MemoryCommunityStore, report } from './community';
import { b64, bytesToHex, fromB64, utf8, verifyEd25519 } from './crypto';
import type { CommunityRpc, Env, MailboxRpc } from './env';
import { MemoryMailboxStore, sync } from './mailbox';
import type { Play, PlayResult } from './play';
import { route } from './router';

const SEED = '11'.repeat(32);
const NOW = 1_800_000_000_000;

class FakeKV {
  data = new Map<string, string>();
  async get(k: string, type?: 'json') {
    const v = this.data.get(k);
    return v === undefined ? null : type === 'json' ? JSON.parse(v) : v;
  }
  async put(k: string, v: string) {
    this.data.set(k, v);
  }
}

function ns<T>(make: () => T) {
  const objects = new Map<string, T>();
  return {
    idFromName: (n: string) => n,
    get: (id: never) => {
      const k = id as unknown as string;
      if (!objects.has(k)) objects.set(k, make());
      return objects.get(k)!;
    },
  };
}

function makeEnv(play: Partial<Play> = {}): Env {
  const ok: PlayResult = { ok: true, needsAck: true };
  return {
    KV: new FakeKV() as unknown as KVNamespace,
    MAILBOX: ns<MailboxRpc>(() => {
      const store = new MemoryMailboxStore();
      return { sync: async (b, now) => sync(store, b, now) };
    }),
    COMMUNITY: ns<CommunityRpc>(() => {
      const store = new MemoryCommunityStore();
      return { list: async (now) => listPosts(store, now), post: async (p) => addPost(store, p), report: async (id, r) => report(store, id, r) };
    }),
    PACKAGE_NAME: 'com.meshradar.findgroupoffline',
    LICENCE_SIGNING_SEED: SEED,
    GOOGLE_SERVICE_ACCOUNT_JSON: '{}',
    ADMIN_TOKEN: 'admin-secret',
    play: {
      product: async () => ok,
      subscription: async () => ({ ok: true, needsAck: false, expiresAt: NOW / 1000 + 365 * 86_400 }),
      acknowledge: async () => undefined,
      ...play,
    },
  };
}

const req = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://api.example${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });

async function call(env: Env, method: string, path: string, body?: unknown, headers?: Record<string, string>, now = NOW) {
  const r = await route(req(method, path, body, headers), env, now);
  return { status: r.status, body: (await r.json().catch(() => null)) as Record<string, unknown> };
}

async function publicKey(env: Env) {
  return (await call(env, 'GET', '/v1/licence/public-key')).body.publicKey as string;
}

async function openLicence(env: Env, token: string) {
  const [body, sig] = token.split('.') as [string, string];
  expect(await verifyEd25519(await publicKey(env), fromB64(body), fromB64(sig))).toBe(true);
  return JSON.parse(new TextDecoder().decode(fromB64(body))) as Record<string, unknown>;
}

const PK = 'ab'.repeat(32);

describe('licences', () => {
  it('issues a signed Event Pass that restoring does not extend', async () => {
    const env = makeEnv();
    const a = await call(env, 'POST', '/v1/licence', { productId: 'event_pass_14d', purchaseToken: 'tok', signPk: PK });
    expect(a.status).toBe(200);
    const lic = await openLicence(env, a.body.licence as string);
    expect(lic).toMatchObject({ kind: 'licence', tier: 'event_pass', sub: PK, exp: NOW / 1000 + 14 * 86_400 });
    const later = await call(env, 'POST', '/v1/licence', { productId: 'event_pass_14d', purchaseToken: 'tok', signPk: PK }, undefined, NOW + 5 * 86_400_000);
    expect((await openLicence(env, later.body.licence as string)).exp).toBe(lic.exp);
  });

  it('limits one purchase to three identities', async () => {
    const env = makeEnv();
    for (const k of ['01', '02', '03']) expect((await call(env, 'POST', '/v1/licence', { productId: 'event_pass_14d', purchaseToken: 't', signPk: k.repeat(32) })).status).toBe(200);
    expect((await call(env, 'POST', '/v1/licence', { productId: 'event_pass_14d', purchaseToken: 't', signPk: '04'.repeat(32) })).status).toBe(409);
  });

  it('rejects unknown products, unpaid purchases and bad keys', async () => {
    const env = makeEnv({ product: async () => ({ ok: false, needsAck: false }) });
    expect((await call(env, 'POST', '/v1/licence', { productId: 'x', purchaseToken: 't', signPk: PK })).status).toBe(400);
    expect((await call(env, 'POST', '/v1/licence', { productId: 'event_pass_14d', purchaseToken: 't', signPk: PK })).status).toBe(402);
    expect((await call(env, 'POST', '/v1/licence', { productId: 'event_pass_14d', purchaseToken: 't', signPk: 'zz' })).status).toBe(400);
  });

  it('uses the Play expiry for Family Plus and the roster size for organisers', async () => {
    const env = makeEnv();
    const fam = await call(env, 'POST', '/v1/licence', { productId: 'family_plus_yearly', purchaseToken: 'f', signPk: PK });
    expect(await openLicence(env, fam.body.licence as string)).toMatchObject({ tier: 'family_plus', exp: NOW / 1000 + 365 * 86_400 });
    const org = await call(env, 'POST', '/v1/licence', { productId: 'organiser_100', purchaseToken: 'o', signPk: PK });
    expect(await openLicence(env, org.body.licence as string)).toMatchObject({ tier: 'organiser', members: 100 });
  });

  it('grants one first-pilgrimage pass per identity', async () => {
    const env = makeEnv();
    expect((await call(env, 'POST', '/v1/licence/first-pilgrimage', { signPk: PK, eventId: 'hajj' })).status).toBe(200);
    expect((await call(env, 'POST', '/v1/licence/first-pilgrimage', { signPk: PK, eventId: 'umrah' })).status).toBe(409);
    expect((await call(env, 'POST', '/v1/licence/first-pilgrimage', { signPk: '02'.repeat(32), eventId: 'concerts' })).status).toBe(400);
  });

  it('issues organiser certificates only to organiser licences', async () => {
    const env = makeEnv();
    const org = (await call(env, 'POST', '/v1/licence', { productId: 'organiser_50', purchaseToken: 'o', signPk: PK })).body.licence;
    const pass = (await call(env, 'POST', '/v1/licence', { productId: 'event_pass_14d', purchaseToken: 'p', signPk: PK })).body.licence;
    const cert = await call(env, 'POST', '/v1/organiser/cert', { licence: org, eventPk: 'cd'.repeat(32), eventId: 'kumbh-magh-mela', name: 'Mela Committee' });
    expect(cert.status).toBe(200);
    expect(await openLicence(env, cert.body.cert as string)).toMatchObject({ kind: 'organiser_cert', pk: 'cd'.repeat(32), eventId: 'kumbh-magh-mela' });
    expect((await call(env, 'POST', '/v1/organiser/cert', { licence: pass, eventPk: 'cd'.repeat(32), eventId: 'x', name: 'n' })).status).toBe(403);
  });
});

describe('signed packs', () => {
  const pack = {
    id: 'test-pack', version: 2, category: 'festival', colors: ['#000000', '#FFFFFF'], icon: 'flag', countries: ['IN'], languages: ['en'],
    title: { en: 'Test' }, summary: { en: 'S' }, dates: [], meetingPoints: [{ name: { en: 'A' }, detail: { en: 'B' } }], dos: [{ en: 'd' }], donts: [{ en: 'n' }],
    schedule: [], phrasebook: [], checklist: [{ en: 'c' }], sources: ['https://example.org'], verified: false,
  };

  it('stores only admin uploads and signs the exact bytes served', async () => {
    const env = makeEnv();
    expect((await call(env, 'PUT', '/v1/admin/packs/test-pack', pack)).status).toBe(401);
    expect((await call(env, 'PUT', '/v1/admin/packs/other', pack, { authorization: 'Bearer admin-secret' })).status).toBe(400);
    expect((await call(env, 'PUT', '/v1/admin/packs/test-pack', pack, { authorization: 'Bearer admin-secret' })).status).toBe(200);
    const body = await (await route(req('GET', '/v1/packs/test-pack.json'), env, NOW)).text();
    const sig = await (await route(req('GET', '/v1/packs/test-pack.sig'), env, NOW)).text();
    expect(await verifyEd25519(await publicKey(env), utf8(body), fromB64(sig))).toBe(true);
    expect((await route(req('GET', '/v1/packs/missing.json'), env, NOW)).status).toBe(404);
  });
});

describe('family circle mailbox', () => {
  it('passes packets between phones with cursors', async () => {
    const env = makeEnv();
    const mailbox = 'ab'.repeat(16);
    const a1 = await call(env, 'POST', '/v1/circle/sync', { mailbox, cursor: '', packets: [b64(utf8('p1')), b64(utf8('p2'))] });
    expect(a1.body).toEqual({ cursor: '0', packets: [] });
    const b1 = await call(env, 'POST', '/v1/circle/sync', { mailbox, cursor: '', packets: [b64(utf8('q1'))] });
    expect((b1.body.packets as string[]).map((p) => new TextDecoder().decode(fromB64(p)))).toEqual(['p1', 'p2']);
    const a2 = await call(env, 'POST', '/v1/circle/sync', { mailbox, cursor: a1.body.cursor, packets: [] });
    expect((a2.body.packets as string[]).length).toBe(3);
    const a3 = await call(env, 'POST', '/v1/circle/sync', { mailbox, cursor: a2.body.cursor, packets: [] });
    expect(a3.body.packets).toEqual([]);
  });

  it('rejects bad mailboxes and oversized packets, and drops packets after 24 hours', async () => {
    const env = makeEnv();
    expect((await call(env, 'POST', '/v1/circle/sync', { mailbox: 'nothex', cursor: '', packets: [] })).status).toBe(400);
    expect((await call(env, 'POST', '/v1/circle/sync', { mailbox: 'ab'.repeat(16), cursor: '', packets: [b64(new Uint8Array(13 * 1024))] })).status).toBe(400);
    const store = new MemoryMailboxStore();
    sync(store, { cursor: '', packets: ['AA=='] }, NOW);
    expect(sync(store, { cursor: '', packets: [] }, NOW + 25 * 3_600_000).packets).toEqual([]);
  });
});

describe('event communities', () => {
  async function keypair() {
    const k = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const pk = bytesToHex(new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey)));
    const sign = async (m: string) => b64(new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, k.privateKey, utf8(m))));
    return { pk, sign };
  }
  const ts = NOW / 1000;

  it('accepts signed posts, rejects forged ones and rate limits per key', async () => {
    const env = makeEnv();
    const me = await keypair();
    const post = async (text: string, sig?: string) =>
      call(env, 'POST', '/v1/community/hajj/posts', { pk: me.pk, text, city: 'Lahore', ts, sig: sig ?? (await me.sign(postSigningMessage({ eventId: 'hajj', pk: me.pk, city: 'Lahore', text, ts }))) });
    expect((await post('Group from Lahore meets after Asr')).status).toBe(200);
    expect((await post('forged', await me.sign('something else'))).status).toBe(403);
    expect((await post('see www.example.com')).status).toBe(400);
    for (let i = 0; i < 4; i++) expect((await post(`tip ${i}`)).status).toBe(200);
    expect((await post('one too many')).status).toBe(429);
    const list = await call(env, 'GET', '/v1/community/hajj/posts');
    expect((list.body.posts as unknown[]).length).toBe(5);
    expect((await call(env, 'POST', '/v1/community/hajj/posts', { pk: me.pk, text: 'old', city: '', ts: ts - 3600, sig: 'AA' })).status).toBe(400);
  });

  it('hides a post after three distinct signed reports', async () => {
    const env = makeEnv();
    const author = await keypair();
    const text = 'Meet at gate 79';
    await call(env, 'POST', '/v1/community/umrah/posts', { pk: author.pk, text, city: '', ts, sig: await author.sign(postSigningMessage({ eventId: 'umrah', pk: author.pk, city: '', text, ts })) });
    const id = ((await call(env, 'GET', '/v1/community/umrah/posts')).body.posts as { id: string }[])[0]!.id;
    const reporters = await Promise.all([keypair(), keypair(), keypair()]);
    for (const [i, r] of reporters.entries()) {
      const res = await call(env, 'POST', '/v1/community/umrah/report', { pk: r.pk, postId: id, ts, sig: await r.sign(reportSigningMessage({ eventId: 'umrah', pk: r.pk, postId: id, ts })) });
      expect(res.status).toBe(200);
      expect(((await call(env, 'GET', '/v1/community/umrah/posts')).body.posts as unknown[]).length).toBe(i < 2 ? 1 : 0);
    }
  });
});
