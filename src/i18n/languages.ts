import type { LanguageCode } from '@/state/settings';

import status from './status.json';

// v1.0 languages (section 11). No flag images or emoji: languages are not countries, and the copy
// rules forbid emoji (DEC-029). The picker shows the native name large and the English name small.
export interface Language {
  code: LanguageCode;
  native: string;
  english: string;
  rtl: boolean;
  script: 'latin' | 'nastaliq' | 'naskh' | 'devanagari' | 'bengali';
  /** Digits most people expect; the person can change it in settings. */
  defaultNumerals: 'western' | 'eastern_arabic';
}

export const LANGUAGES: Language[] = [
  { code: 'en', native: 'English', english: 'English', rtl: false, script: 'latin', defaultNumerals: 'western' },
  { code: 'ur', native: 'اردو', english: 'Urdu', rtl: true, script: 'nastaliq', defaultNumerals: 'western' },
  { code: 'ar', native: 'العربية', english: 'Arabic', rtl: true, script: 'naskh', defaultNumerals: 'eastern_arabic' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', rtl: false, script: 'devanagari', defaultNumerals: 'western' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', rtl: false, script: 'bengali', defaultNumerals: 'western' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian', rtl: false, script: 'latin', defaultNumerals: 'western' },
  { code: 'ms', native: 'Bahasa Melayu', english: 'Malay', rtl: false, script: 'latin', defaultNumerals: 'western' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish', rtl: false, script: 'latin', defaultNumerals: 'western' },
];

/**
 * Languages people can pick (DEC-050). Release builds offer only languages whose safety text has a
 * reviewer (`released` in status.json); development builds offer all of them for translators.
 */
export function availableLanguages(dev: boolean = __DEV__): Language[] {
  const released = status as Record<string, { released?: boolean }>;
  return LANGUAGES.filter((l) => dev || released[l.code]?.released);
}

export function language(code: LanguageCode | null | undefined): Language {
  return availableLanguages().find((l) => l.code === code) ?? LANGUAGES[0]!;
}

/** Best match for the phone's locale list (BCP-47 tags), English otherwise. */
export function matchDeviceLanguage(tags: string[]): LanguageCode {
  for (const tag of tags) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    const found = availableLanguages().find((l) => l.code === base || (base === 'in' && l.code === 'id'));
    if (found) return found.code;
  }
  return 'en';
}
