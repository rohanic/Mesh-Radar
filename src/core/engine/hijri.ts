// Hijri dates for event packs (section 11: Gregorian plus Hijri). toHijri uses Saudi Arabia's
// official Umm al-Qura calendar through Intl when the engine supports it, and the arithmetic
// (tabular) calendar otherwise, which can be a day off. Local moon sighting can still differ, so the
// UI labels these dates "approximately".

const ISLAMIC_EPOCH = 1948439.5;

export function gregorianToJd(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045 - 0.5;
}

export function jdToGregorian(jd: number): { y: number; m: number; d: number } {
  const j = Math.floor(jd + 0.5) + 32044;
  const g = Math.floor(j / 146097);
  const dg = j % 146097;
  const c = Math.floor(((Math.floor(dg / 36524) + 1) * 3) / 4);
  const dc = dg - c * 36524;
  const b = Math.floor(dc / 1461);
  const db = dc % 1461;
  const a = Math.floor(((Math.floor(db / 365) + 1) * 3) / 4);
  const da = db - a * 365;
  const y = g * 400 + c * 100 + b * 4 + a;
  const m = Math.floor((da * 5 + 308) / 153) - 2;
  const d = da - Math.floor(((m + 4) * 153) / 5) + 122;
  return { y: y - 4800 + Math.floor((m + 2) / 12), m: ((m + 2) % 12) + 1, d: d + 1 };
}

export function islamicToJd(y: number, m: number, d: number): number {
  return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + ISLAMIC_EPOCH - 1;
}

export function jdToIslamic(jd: number): { y: number; m: number; d: number } {
  const j = Math.floor(jd) + 0.5;
  const y = Math.floor((30 * (j - ISLAMIC_EPOCH) + 10646) / 10631);
  const m = Math.min(12, Math.ceil((j - (29 + islamicToJd(y, 1, 1))) / 29.5) + 1);
  const d = j - islamicToJd(y, m, 1) + 1;
  return { y, m, d };
}

/** Umm al-Qura date from the JS engine's Intl, or null when the engine lacks that calendar. */
export function umAlQura(ms: number): { y: number; m: number; d: number } | null {
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
    if (f.resolvedOptions().calendar !== 'islamic-umalqura') return null;
    const parts = Object.fromEntries(f.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
    const y = parseInt(parts.year ?? '', 10);
    const m = parseInt(parts.month ?? '', 10);
    const d = parseInt(parts.day ?? '', 10);
    return y > 1300 && m >= 1 && m <= 12 && d >= 1 && d <= 30 ? { y, m, d } : null;
  } catch {
    return null;
  }
}

/** Hijri date for a UTC timestamp. Months are 1 (Muharram) to 12 (Dhu al-Hijjah). */
export function toHijri(ms: number): { y: number; m: number; d: number } {
  const official = umAlQura(ms);
  if (official) return official;
  const date = new Date(ms);
  return jdToIslamic(gregorianToJd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()));
}
