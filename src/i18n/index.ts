// i18next's documented API is the default instance (i18n.use, i18n.changeLanguage).
/* eslint-disable import/no-named-as-default-member */
// Hermes does not ship Intl.PluralRules, which i18next plurals need (DEC-037).
import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import bn from './locales/bn.json';
import en from './locales/en.json';
import hi from './locales/hi.json';
import id from './locales/id.json';
import ms from './locales/ms.json';
import tr from './locales/tr.json';
import ur from './locales/ur.json';
import type { LanguageCode } from '@/state/settings';

// i18next with JSON v4 plural keys (CLDR categories via Intl.PluralRules; DEC-020).
export const resources = {
  en: { translation: en },
  ur: { translation: ur },
  ar: { translation: ar },
  hi: { translation: hi },
  bn: { translation: bn },
  id: { translation: id },
  ms: { translation: ms },
  tr: { translation: tr },
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export function setLanguage(code: LanguageCode) {
  if (i18n.language !== code) void i18n.changeLanguage(code);
}

/** Flat key-value strings for native notifications (engine posts them with the UI closed). */
export function nativeStrings(): Record<string, string> {
  const t = i18n.getFixedT(i18n.language);
  const native = (resources.en.translation as unknown as { native: Record<string, string> }).native;
  const out: Record<string, string> = {};
  for (const key of Object.keys(native)) out[key.replace(/_/g, '.')] = t(`native.${key}`);
  return out;
}

export default i18n;
