// Units and numerals (section 11): metres by default, feet and miles available; Western or Eastern
// Arabic digits per the person's setting.

export type Units = 'metric' | 'imperial';
export type Numerals = 'western' | 'eastern_arabic';

const EASTERN = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
/** Urdu writes Eastern digits with the Extended Arabic-Indic set (U+06F0 to U+06F9). */
const EXTENDED = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toNumerals(text: string, numerals: Numerals, extended = false): string {
  if (numerals === 'western') return text;
  const set = extended ? EXTENDED : EASTERN;
  return text.replace(/[0-9]/g, (d) => set[Number(d)]!);
}

export interface DistanceParts {
  value: number;
  unit: 'm' | 'km' | 'ft' | 'mi';
}

/**
 * Honest precision (principle 4): whole metres under 1 km, then 0.1 km. Imperial uses feet under
 * 0.1 mile (528 ft), then miles to one decimal.
 */
export function distanceParts(metres: number, units: Units): DistanceParts {
  const m = Math.max(0, metres);
  if (units === 'imperial') {
    const feet = m * 3.28084;
    if (feet < 528) return { value: Math.round(feet / 5) * 5, unit: 'ft' };
    return { value: Math.round((m / 1609.344) * 10) / 10, unit: 'mi' };
  }
  if (m < 1000) return { value: m < 20 ? Math.round(m) : Math.round(m / 5) * 5, unit: 'm' };
  return { value: Math.round(m / 100) / 10, unit: 'km' };
}

export function formatDistance(metres: number, units: Units, numerals: Numerals, extended = false): string {
  const { value, unit } = distanceParts(metres, units);
  return toNumerals(`${value} ${unit}`, numerals, extended);
}
