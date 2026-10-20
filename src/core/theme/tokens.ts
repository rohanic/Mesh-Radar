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
  accent: string;
  onAccent: string;
  sos: string;
  onSos: string;
  warning: string;
  success: string;
  radarRing: string;
  radarSweep: string;
  overlay: string;
}

export const palettes: Record<ThemeName, Colors> = {
  light: {
    bg: '#F6F8FB',
    surface: '#FFFFFF',
    surfaceRaised: '#EEF2F7',
    border: '#DCE2EA',
    text: '#0B1220',
    textMuted: '#5A6478',
    // DEC-028: #00987F with white text is 3.6:1; darkened for AA. #00987F stays for the radar sweep.
    primary: '#007F6A',
    onPrimary: '#FFFFFF',
    accent: '#6350F5',
    onAccent: '#FFFFFF',
    sos: '#D91F36',
    onSos: '#FFFFFF',
    warning: '#C77700',
    success: '#148A45',
    radarRing: '#B9C4D2',
    radarSweep: '#00987F',
    overlay: 'rgba(11,18,32,0.45)',
  },
  dark: {
    bg: '#070C17',
    surface: '#0F1626',
    surfaceRaised: '#172036',
    border: '#25304A',
    text: '#EAF0FA',
    textMuted: '#96A3BC',
    primary: '#2EE6C5',
    onPrimary: '#04251F',
    accent: '#9A8CFF',
    onAccent: '#0B0830',
    sos: '#FF4D5E',
    onSos: '#1A0004',
    warning: '#FFB547',
    success: '#3DDC84',
    radarRing: '#25304A',
    radarSweep: '#2EE6C5',
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
    accent: '#3A27C9',
    onAccent: '#FFFFFF',
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
  { name: 'teal', light: '#00897B', dark: '#2EE6C5', shape: 'circle' },
  { name: 'violet', light: '#6350F5', dark: '#9A8CFF', shape: 'triangle' },
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
