import { getLocales } from 'expo-localization';

import data from '@config/emergency-numbers.json';
import type { LanguageCode } from '@/state/settings';

// Offline emergency numbers by country (E5). Sourced from official pages and marked unverified
// until a person confirms them (DEC-004); `npm run check:release` blocks release until then.

export type Localized = Partial<Record<LanguageCode, string>> & { en: string };

export interface EmergencyNumber {
  id: string;
  label: Localized;
  number: string;
  source: string;
  verified: boolean;
}

export interface CountryNumbers {
  code: string;
  name: Localized;
  numbers: EmergencyNumber[];
  note?: Localized;
}

const countries = (data as { countries: Record<string, Omit<CountryNumbers, 'code'>> }).countries;

export function allCountries(): CountryNumbers[] {
  return Object.entries(countries).map(([code, c]) => ({ code, ...c }));
}

export function numbersFor(code: string | null | undefined): CountryNumbers | null {
  if (!code) return null;
  const c = countries[code.toUpperCase()];
  return c ? { code: code.toUpperCase(), ...c } : null;
}

export function pick(text: Localized, lang: LanguageCode | null): string {
  return (lang && text[lang]) || text.en;
}

/** The phone's region, used as a default before an event pack is active. */
export function deviceCountry(): string | null {
  return getLocales()[0]?.regionCode ?? null;
}
