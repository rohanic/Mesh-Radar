import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { kvStorage } from './storage';

export interface PurchasesState {
  /** Licence tokens issued by the Worker after Play verified a purchase (DEC-016). */
  tokens: string[];
  firstPilgrimageClaimed: boolean;
  /** Organiser certificates by event ID, for signed crowd alerts (E8). */
  organiserCerts: Record<string, string>;
  addToken: (t: string) => void;
  set: (patch: Partial<Pick<PurchasesState, 'firstPilgrimageClaimed' | 'organiserCerts'>>) => void;
  reset: () => void;
}

export const usePurchases = create<PurchasesState>()(
  persist(
    (set) => ({
      tokens: [],
      firstPilgrimageClaimed: false,
      organiserCerts: {},
      addToken: (t) => set((s) => ({ tokens: s.tokens.includes(t) ? s.tokens : [...s.tokens, t] })),
      set: (patch) => set(patch),
      reset: () => set({ tokens: [], firstPilgrimageClaimed: false, organiserCerts: {} }),
    }),
    { name: 'purchases', storage: kvStorage, version: 1 },
  ),
);
