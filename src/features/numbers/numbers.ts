import { Alert, Linking } from 'react-native';
import { getLocales } from 'expo-localization';

import data from '@config/emergency-numbers.json';
import type { NumberKind } from '@/core/engine/numbers';
import type { LanguageCode } from '@/state/settings';

export { NUMBER_KINDS, type NumberKind } from '@/core/engine/numbers';

// Offline emergency numbers by country (E5). Sourced from official pages and marked unverified
// until a person confirms them (DEC-004); `npm run check:release` blocks release until then.

export type Localized = Partial<Record<LanguageCode, string>> & { en: string };

export interface EmergencyNumber {
  id: string;
  /** Shown in the reader's language from `numbers.kinds`; the label names the service. */
  kind: NumberKind;
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

/**
 * Opens the dialler with the number (E5). Phones without calling (Wi-Fi tablets, some Android Go
 * devices) cannot open `tel:`, so the number is shown instead of failing silently. Never throws.
 */
export function dial(number: string, cannotCall: string): void {
  Linking.openURL(`tel:${number}`).catch(() => Alert.alert(number, cannotCall));
}

/** Opens a web page or store link; nothing happens if no app can open it. Never throws. */
export function openLink(url: string): void {
  Linking.openURL(url).catch(() => undefined);
}
