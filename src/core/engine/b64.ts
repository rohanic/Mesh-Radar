// Base64 and UTF-8 helpers without platform globals (Hermes lacks some web APIs).

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(input: string): Uint8Array {
  const s = input.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of s) {
    buffer = (buffer << 6) | ALPHABET.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

export function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i]!;
    let cp: number;
    if (b < 0x80) {
      cp = b;
      i += 1;
    } else if (b >> 5 === 0x6) {
      cp = ((b & 0x1f) << 6) | (bytes[i + 1]! & 0x3f);
      i += 2;
    } else if (b >> 4 === 0xe) {
      cp = ((b & 0x0f) << 12) | ((bytes[i + 1]! & 0x3f) << 6) | (bytes[i + 2]! & 0x3f);
      i += 3;
    } else {
      cp = ((b & 0x07) << 18) | ((bytes[i + 1]! & 0x3f) << 12) | ((bytes[i + 2]! & 0x3f) << 6) | (bytes[i + 3]! & 0x3f);
      i += 4;
    }
    out += String.fromCodePoint(cp);
  }
  return out;
}

/** Decodes the child's name from a lost-child card payload ("<finderKey>.<name>", base64url). */
export function cardName(payload: string): string {
  const part = payload.split('.')[1];
  if (!part) return '';
  try {
    return utf8Decode(base64ToBytes(part));
  } catch {
    return '';
  }
}
