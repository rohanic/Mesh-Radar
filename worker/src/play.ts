import { b64url, fromB64, utf8 } from './crypto';

// Google Play Developer API (purchases.products, purchases.subscriptionsv2) with a service account.
// The service account JSON lives only in the Worker secret GOOGLE_SERVICE_ACCOUNT_JSON.

const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

export type Fetch = typeof fetch;

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cached: { token: string; exp: number } | null = null;

async function accessToken(saJson: string, f: Fetch, nowSec: number): Promise<string> {
  if (cached && cached.exp - 60 > nowSec) return cached.token;
  const sa = JSON.parse(saJson) as ServiceAccount;
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token';
  const header = b64url(utf8(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = b64url(utf8(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: tokenUri, iat: nowSec, exp: nowSec + 3600 })));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', fromB64(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8(`${header}.${claims}`)));
  const res = await f(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${header}.${claims}.${b64url(sig)}`,
  });
  if (!res.ok) throw new Error(`oauth ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: body.access_token, exp: nowSec + body.expires_in };
  return body.access_token;
}

export interface PlayResult {
  ok: boolean;
  /** Seconds since the epoch; for subscriptions the current period's expiry. */
  expiresAt?: number;
  needsAck: boolean;
}

export interface Play {
  product(productId: string, token: string): Promise<PlayResult>;
  subscription(productId: string, token: string): Promise<PlayResult>;
  acknowledge(kind: 'products' | 'subscriptions', productId: string, token: string): Promise<void>;
}

export function googlePlay(packageName: string, saJson: string, f: Fetch = fetch): Play {
  const call = async (path: string, init?: RequestInit) => {
    const auth = await accessToken(saJson, f, Math.floor(Date.now() / 1000));
    return f(`${API}/${encodeURIComponent(packageName)}/${path}`, { ...init, headers: { authorization: `Bearer ${auth}`, ...(init?.headers ?? {}) } });
  };
  return {
    async product(productId, token) {
      const r = await call(`purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`);
      if (!r.ok) return { ok: false, needsAck: false };
      // purchaseState: 0 purchased, 1 cancelled, 2 pending. acknowledgementState: 0 not yet.
      const p = (await r.json()) as { purchaseState?: number; acknowledgementState?: number };
      return { ok: p.purchaseState === 0, needsAck: p.acknowledgementState === 0 };
    },
    async subscription(productId, token) {
      const r = await call(`purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`);
      if (!r.ok) return { ok: false, needsAck: false };
      const s = (await r.json()) as {
        subscriptionState?: string;
        acknowledgementState?: string;
        lineItems?: { productId?: string; expiryTime?: string }[];
      };
      const active = s.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' || s.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';
      const item = s.lineItems?.find((l) => l.productId === productId);
      const exp = item?.expiryTime ? Math.floor(Date.parse(item.expiryTime) / 1000) : NaN;
      return { ok: active && !!item && Number.isFinite(exp), expiresAt: exp, needsAck: s.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING' };
    },
    async acknowledge(kind, productId, token) {
      await call(`purchases/${kind}/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
    },
  };
}
