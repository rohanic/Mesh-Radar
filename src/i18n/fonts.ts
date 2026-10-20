import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { NotoNaskhArabic_400Regular, NotoNaskhArabic_700Bold } from '@expo-google-fonts/noto-naskh-arabic';
import { NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold } from '@expo-google-fonts/noto-nastaliq-urdu';
import { NotoSansBengali_400Regular, NotoSansBengali_700Bold } from '@expo-google-fonts/noto-sans-bengali';
import { NotoSansDevanagari_400Regular, NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari';

import type { Language } from './languages';

// Section 7 typography. Inter for Latin scripts, Noto for the rest (DEC-018).
export const FONT_ASSETS = {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  NotoNastaliqUrdu_400Regular,
  NotoNastaliqUrdu_700Bold,
  NotoNaskhArabic_400Regular,
  NotoNaskhArabic_700Bold,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_700Bold,
  NotoSansBengali_400Regular,
  NotoSansBengali_700Bold,
};

export interface ScriptFonts {
  regular: string;
  bold: string;
  /** Line height multiplier: Nastaliq is tall (section 7: 1.9x). */
  lineHeight: number;
}

export function fontsFor(script: Language['script']): ScriptFonts {
  switch (script) {
    case 'nastaliq':
      return { regular: 'NotoNastaliqUrdu_400Regular', bold: 'NotoNastaliqUrdu_700Bold', lineHeight: 1.9 };
    case 'naskh':
      return { regular: 'NotoNaskhArabic_400Regular', bold: 'NotoNaskhArabic_700Bold', lineHeight: 1.6 };
    case 'devanagari':
      return { regular: 'NotoSansDevanagari_400Regular', bold: 'NotoSansDevanagari_700Bold', lineHeight: 1.55 };
    case 'bengali':
      return { regular: 'NotoSansBengali_400Regular', bold: 'NotoSansBengali_700Bold', lineHeight: 1.55 };
    default:
      return { regular: 'Inter_400Regular', bold: 'Inter_700Bold', lineHeight: 1.35 };
  }
}
