// "Beacon" design system tokens (PRD section 7). Red is reserved for SOS only.

export type ThemeName = 'light' | 'dark' | 'sunlight';

export interface Colors {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  /** Tinted backgrounds behind primary and accent icons (no text-only use). */
  primarySoft: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  sos: string;
  onSos: string;
  warning: string;
  success: string;
  radarRing: string;
  radarSweep: string;
  overlay: string;
}

// DEC-045: palettes refreshed to match the neon Location Pin logo. Every text pair is checked for
// WCAG AA in contrast.test.ts.
export const palettes: Record<ThemeName, Colors> = {
  light: {
    bg: '#F3F6FA',
    surface: '#FFFFFF',
    surfaceRaised: '#EAF0F6',
    border: '#D8E0EA',
    text: '#0A1324',
    textMuted: '#536079',
    // Cyan teal from the logo, dark enough for white text (5.1:1, DEC-028).
    primary: '#007A80',
    onPrimary: '#FFFFFF',
    primarySoft: '#DDF3F4',
    accent: '#5B46F0',
    onAccent: '#FFFFFF',
    accentSoft: '#ECE9FF',
    sos: '#D91F36',
    onSos: '#FFFFFF',
    warning: '#9A5B00',
    success: '#0F7A45',
    radarRing: '#C3CEDB',
    radarSweep: '#0097A0',
    overlay: 'rgba(10,19,36,0.45)',
  },
  dark: {
    bg: '#060B16',
    surface: '#0E1729',
    surfaceRaised: '#16213A',
    border: '#233150',
    text: '#EAF1FB',
    textMuted: '#9AA8C2',
    // The logo's neon teal and violet glow.
    primary: '#2CEFD6',
    onPrimary: '#03241F',
    primarySoft: '#0D2D33',
    accent: '#9D8CFF',
    onAccent: '#120A3A',
    accentSoft: '#1E1A45',
    sos: '#FF4D5E',
    onSos: '#1A0004',
    warning: '#FFB547',
    success: '#3DDC84',
    radarRing: '#22324F',
    radarSweep: '#2CEFD6',
    overlay: 'rgba(0,0,0,0.6)',
  },
  // High-contrast Sunlight theme (H2): black on white, no tinted surfaces.
  sunlight: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    border: '#000000',
    text: '#000000',
    textMuted: '#000000',
    primary: '#00574A',
    onPrimary: '#FFFFFF',
    primarySoft: '#FFFFFF',
    accent: '#3A27C9',
    onAccent: '#FFFFFF',
    accentSoft: '#FFFFFF',
    sos: '#B00020',
    onSos: '#FFFFFF',
    warning: '#7A4700',
    success: '#0B5A2C',
    radarRing: '#000000',
    radarSweep: '#00574A',
    overlay: 'rgba(0,0,0,0.7)',
  },
};

/**
 * Group colours (8, each paired with a shape so colour is never the only cue): Teal circle,
 * Violet triangle, Amber square, Rose diamond, Sky circle, Lime triangle, Coral square, Slate diamond.
 */
export type GroupShape = 'circle' | 'triangle' | 'square' | 'diamond';
export const groupColours: { name: string; light: string; dark: string; shape: GroupShape }[] = [
  { name: 'teal', light: '#00838A', dark: '#2CEFD6', shape: 'circle' },
  { name: 'violet', light: '#5B46F0', dark: '#9D8CFF', shape: 'triangle' },
  { name: 'amber', light: '#B26A00', dark: '#FFB547', shape: 'square' },
  { name: 'rose', light: '#C2185B', dark: '#FF7AA8', shape: 'diamond' },
  { name: 'sky', light: '#0277BD', dark: '#5CC8FF', shape: 'circle' },
  { name: 'lime', light: '#4E7D00', dark: '#B5E655', shape: 'triangle' },
  { name: 'coral', light: '#C1440E', dark: '#FF8A65', shape: 'square' },
  { name: 'slate', light: '#455A64', dark: '#B0BEC5', shape: 'diamond' },
];

/** Type scale in sp (section 7). Elder mode adds 4 sp to every step. */
export const typeScale = {
  caption: 12,
  bodySmall: 14,
  body: 16,
  title: 20,
  headline: 24,
  distance: 32,
  findDistance: 56,
} as const;
export type TypeVariant = keyof typeof typeScale;
export const ELDER_BONUS = 4;

/** 4 dp grid, radii and touch targets (section 7). */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { chip: 12, card: 20, sheet: 28, pill: 999 } as const;
export const touch = { min: 48, elder: 56, sos: 72 } as const;
export const motion = { micro: 150, standard: 250, sheet: 400, sweepMs: 4000 } as const;
