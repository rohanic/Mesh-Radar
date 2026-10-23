import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { dayKey } from '@/core/engine/review';
import { kvStorage } from './storage';

/** What the update and review prompts remember between launches (DEC-043, DEC-044). */
export interface PromptsState {
  firstOpenMs: number;
  activeDays: number;
  lastDay: number;
  lastSosMs: number;
  reviewAsks: number;
  lastReviewAskMs: number;
  dismissedVersion: number;
  dismissedAtMs: number;
  set: (patch: Partial<Omit<PromptsState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const defaults = { firstOpenMs: 0, activeDays: 0, lastDay: -1, lastSosMs: 0, reviewAsks: 0, lastReviewAskMs: 0, dismissedVersion: 0, dismissedAtMs: 0 };

export const usePrompts = create<PromptsState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (patch) => set(patch),
      reset: () => set(defaults),
    }),
    { name: 'prompts', storage: kvStorage, version: 1 },
  ),
);

/** Counts each local day the app is opened once. */
export function recordOpen(nowMs = Date.now()) {
  const day = dayKey(nowMs, new Date(nowMs).getTimezoneOffset());
  usePrompts.setState((s) => (s.lastDay === day ? s : { firstOpenMs: s.firstOpenMs || nowMs, activeDays: s.activeDays + 1, lastDay: day }));
}

export function recordSos(nowMs = Date.now()) {
  usePrompts.setState({ lastSosMs: nowMs });
}
