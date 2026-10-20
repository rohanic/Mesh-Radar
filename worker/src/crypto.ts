// Byte, encoding and Ed25519 helpers on Web Crypto (available in Workers and Node 22).

const enc = new TextEncoder();

export function utf8(s: string): Uint8Array {
  return enc.encode(s);
}

export function hexToBytes(hex: string): Uint8Array {
  if (!/^([0-9a-f]{2})*$/i.test(hex)) throw new Error('bad hex');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(b: Uint8Array): string {
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function b64(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

export function fromB64(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function b64url(b: Uint8Array): string {
  return b64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Hex(s: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(s))));
}

export function isHex(s: unknown, chars: number): s is string {
  return typeof s === 'string' && s.length === chars && /^[0-9a-f]+$/i.test(s);
}

/** Constant-time string comparison for bearer tokens. */
export function safeEqual(a: string, b: string): boolean {
  const x = utf8(a);
  const y = utf8(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

// PKCS#8 wrapper for a raw 32-byte Ed25519 seed (RFC 8410). Web Crypto does not import raw
// Ed25519 private keys, so the Worker secret holds the seed and this builds the DER around it.
const PKCS8_PREFIX = hexToBytes('302e020100300506032b657004220420');

export interface Signer {
  publicKeyHex: string;
  sign(message: Uint8Array): Promise<Uint8Array>;
}

const signers = new Map<string, Promise<Signer>>();

export function signer(seedHex: string): Promise<Signer> {
  let s = signers.get(seedHex);
  if (!s) {
    s = (async () => {
      if (!isHex(seedHex, 64)) throw new Error('LICENCE_SIGNING_SEED must be 64 hex characters');
      const der = new Uint8Array(48);
      der.set(PKCS8_PREFIX);
      der.set(hexToBytes(seedHex), 16);
      const key = await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, true, ['sign']);
      const jwk = (await crypto.subtle.exportKey('jwk', key)) as JsonWebKey;
      return {
        publicKeyHex: bytesToHex(fromB64(jwk.x!)),
        sign: async (m: Uint8Array) => new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, key, m)),
      };
    })();
    signers.set(seedHex, s);
  }
  return s;
}

export async function verifyEd25519(publicKeyHex: string, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
  if (!isHex(publicKeyHex, 64) || signature.length !== 64) return false;
  try {
    const key = await crypto.subtle.importKey('raw', hexToBytes(publicKeyHex), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, signature, message);
  } catch {
    return false;
  }
}

/** `base64url(json).base64url(signature)`, the format Licences.kt verifies (DEC-016). */
export async function signToken(s: Signer, payload: Record<string, unknown>): Promise<string> {
  const body = utf8(JSON.stringify(payload));
  return `${b64url(body)}.${b64url(await s.sign(body))}`;
}

export async function openToken(s: Signer, token: string): Promise<Record<string, unknown> | null> {
  const parts = token.trim().split('.');
  if (parts.length !== 2) return null;
  try {
    const body = fromB64(parts[0]!);
    if (!(await verifyEd25519(s.publicKeyHex, body, fromB64(parts[1]!)))) return null;
    return JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
