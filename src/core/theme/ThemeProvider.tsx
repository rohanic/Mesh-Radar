import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

import { fontsFor, type ScriptFonts } from '@/i18n/fonts';
import { language } from '@/i18n/languages';
import { useSettings } from '@/state/settings';
import { ELDER_BONUS, groupColours, palettes, touch, typeScale, type Colors, type ThemeName, type TypeVariant } from './tokens';

export interface Theme {
  name: ThemeName;
  dark: boolean;
  colors: Colors;
  fonts: ScriptFonts;
  elder: boolean;
  reduceMotion: boolean;
  rtl: boolean;
  size: (v: TypeVariant) => number;
  touch: number;
  groupColour: (index: number) => { color: string; shape: (typeof groupColours)[number]['shape']; name: string };
}

const ThemeContext = createContext<Theme | null>(null);

export function resolveThemeName(pref: 'system' | ThemeName, system: 'light' | 'dark' | null | undefined): ThemeName {
  if (pref === 'system') return system === 'dark' ? 'dark' : 'light';
  return pref;
}

export function buildTheme(name: ThemeName, elder: boolean, reduceMotion: boolean, lang: ReturnType<typeof language>): Theme {
  const colors = palettes[name];
  const dark = name === 'dark';
  return {
    name,
    dark,
    colors,
    fonts: fontsFor(lang.script),
    elder,
    reduceMotion,
    rtl: lang.rtl,
    size: (v) => typeScale[v] + (elder ? ELDER_BONUS : 0),
    touch: elder ? touch.elder : touch.min,
    groupColour: (index) => {
      const g = groupColours[((index % groupColours.length) + groupColours.length) % groupColours.length]!;
      return { color: dark ? g.dark : g.light, shape: g.shape, name: g.name };
    },
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const pref = useSettings((s) => s.theme);
  const elder = useSettings((s) => s.elderMode);
  const code = useSettings((s) => s.language);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Respect the system "Remove animations" setting: sweep and pulses become static (section 7).
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduceMotion(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const theme = useMemo(
    () => buildTheme(resolveThemeName(pref, system), elder, reduceMotion, language(code)),
    [pref, system, elder, reduceMotion, code],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  // Outside the provider (isolated component tests) fall back to the light theme.
  return t ?? buildTheme('light', false, true, language('en'));
}
