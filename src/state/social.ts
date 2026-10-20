import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Memory } from '@/core/engine/memories';
import { kvStorage } from './storage';

export interface SocialState {
  /** North-star metric counted on the device (section 12). */
  regroups: number;
  drillsCompleted: number;
  /** Times the person told family they were OK or checked in (G9 streaks). */
  checkins: number[];
  eventsAttended: string[];
  memories: Memory[];
  lastHid: Record<string, number>;
  seenBadges: string[];
  add: (patch: Partial<Omit<SocialState, 'add' | 'reset'>>) => void;
  reset: () => void;
}

const defaults = { regroups: 0, drillsCompleted: 0, checkins: [], eventsAttended: [], memories: [], lastHid: {}, seenBadges: [] };

export const useSocial = create<SocialState>()(
  persist(
    (set) => ({
      ...defaults,
      add: (patch) => set(patch),
      reset: () => set(defaults),
    }),
    { name: 'social', storage: kvStorage, version: 1 },
  ),
);

export function recordCheckin() {
  useSocial.setState((s) => ({ checkins: [...s.checkins.slice(-200), Date.now()] }));
}

export function recordRegroup() {
  useSocial.setState((s) => ({ regroups: s.regroups + 1 }));
}
