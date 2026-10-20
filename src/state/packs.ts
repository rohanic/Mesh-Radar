import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { EventPack } from '@/core/packs/schema';
import { kvStorage } from './storage';

export interface PacksState {
  /** Installed packs by ID: bundled, updated from the Worker, or community-made. */
  installed: Record<string, EventPack>;
  /** F5: "Prepare your group" checklist progress, packId -> item indexes. */
  checklist: Record<string, number[]>;
  /** Pack shown on the event day dashboard and used for emergency numbers. */
  activeEventId: string | null;
  activeCountry: string | null;
  eventDay: boolean;
  /** G7: event communities the person opted into. */
  communities: string[];
  install: (p: EventPack) => void;
  remove: (id: string) => void;
  toggleItem: (packId: string, index: number) => void;
  set: (patch: Partial<Pick<PacksState, 'activeEventId' | 'activeCountry' | 'eventDay' | 'communities'>>) => void;
  reset: () => void;
}

export const usePacks = create<PacksState>()(
  persist(
    (set) => ({
      installed: {},
      checklist: {},
      activeEventId: null,
      activeCountry: null,
      eventDay: false,
      communities: [],
      install: (p) => set((s) => ({ installed: { ...s.installed, [p.id]: p } })),
      remove: (id) =>
        set((s) => {
          const next = { ...s.installed };
          delete next[id];
          return { installed: next, activeEventId: s.activeEventId === id ? null : s.activeEventId };
        }),
      toggleItem: (packId, index) =>
        set((s) => {
          const cur = s.checklist[packId] ?? [];
          return { checklist: { ...s.checklist, [packId]: cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index] } };
        }),
      set: (patch) => set(patch),
      reset: () => set({ installed: {}, checklist: {}, activeEventId: null, activeCountry: null, eventDay: false, communities: [] }),
    }),
    { name: 'packs', storage: kvStorage, version: 1 },
  ),
);
