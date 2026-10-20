import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Numerals, Units } from '@/core/engine/units';
import { kvStorage } from './storage';

export type ThemePref = 'system' | 'light' | 'dark' | 'sunlight';
export type LanguageCode = 'en' | 'ur' | 'ar' | 'hi' | 'bn' | 'id' | 'ms' | 'tr';

export type OnboardingStep = 'language' | 'welcome' | 'profile' | 'card' | 'permissions' | 'group' | 'tutorial' | 'done';

export interface SettingsState {
  language: LanguageCode | null;
  theme: ThemePref;
  units: Units;
  numerals: Numerals;
  /** H3: larger text and three big buttons. */
  elderMode: boolean;
  onboarding: OnboardingStep;
  tutorialDone: boolean;
  /** Last day the "finish setup" nudge was shown (section 6: nudged daily until done). */
  lastNudgeDay: string;
  analyticsOptIn: boolean;
  crashOptIn: boolean;
  activeGroupId: string | null;
  sirenDefault: boolean;
  /** Radar or list (C5). */
  radarView: 'radar' | 'list';
  oemGuideSeen: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const defaults = {
  language: null,
  theme: 'system' as ThemePref,
  units: 'metric' as Units,
  numerals: 'western' as Numerals,
  elderMode: false,
  onboarding: 'language' as OnboardingStep,
  tutorialDone: false,
  lastNudgeDay: '',
  analyticsOptIn: false,
  crashOptIn: false,
  activeGroupId: null,
  sirenDefault: true,
  radarView: 'radar' as const,
  oemGuideSeen: false,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (patch) => set(patch),
      reset: () => set(defaults),
    }),
    { name: 'settings', storage: kvStorage, version: 1 },
  ),
);
