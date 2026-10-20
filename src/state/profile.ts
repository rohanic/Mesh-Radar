import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { EmergencyCard } from 'mesh-engine';
import { kvStorage } from './storage';

export const emptyCard: EmergencyCard = {
  name: '',
  bloodGroup: '',
  conditions: '',
  medicines: '',
  contactName: '',
  contactPhone: '',
  stay: '',
};

export interface ProfileState {
  name: string;
  colour: number;
  avatarPreset: number;
  /** Base64 JPEG under 4 KB for the mesh (A3); the full image stays on the phone. */
  avatarPhoto: string | null;
  card: EmergencyCard;
  /** A4: the person chose to show the card on the lock screen (DEC-025). */
  cardOnLockScreen: boolean;
  set: (patch: Partial<Omit<ProfileState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const defaults = { name: '', colour: 0, avatarPreset: 0, avatarPhoto: null, card: emptyCard, cardOnLockScreen: false };

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (patch) => set(patch),
      reset: () => set(defaults),
    }),
    { name: 'profile', storage: kvStorage, version: 1 },
  ),
);
