import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { InstallStatus, UpdateInfo } from '@/core/engine/updates';

// Google Play in-app updates (DEC-043) and review (DEC-044). Without the native module (Jest,
// Expo Go) or without Play, every call reports "unknown" and nothing is shown.

export interface UpdateState {
  status: InstallStatus;
  bytes: number;
  total: number;
  error: number;
}

type PlayStoreEvents = { updateState: (e: UpdateState) => void };

declare class NativePlayStore extends NativeModule<PlayStoreEvents> {
  versionCode(): number;
  checkUpdate(): Promise<UpdateInfo>;
  startUpdate(): Promise<boolean>;
  completeUpdate(): Promise<void>;
  requestReview(): Promise<boolean>;
}

const native = requireOptionalNativeModule<NativePlayStore>('PlayStore');

export const UNKNOWN_UPDATE: UpdateInfo = {
  availability: 'unknown',
  versionCode: 0,
  stalenessDays: null,
  priority: 0,
  flexibleAllowed: false,
  installStatus: 'unknown',
};

export const PlayStore = {
  available: native != null,
  /** This build's version code; 1 when the native module is missing. */
  versionCode: (): number => native?.versionCode() ?? 1,
  checkUpdate: async (): Promise<UpdateInfo> => (native ? native.checkUpdate().catch(() => UNKNOWN_UPDATE) : UNKNOWN_UPDATE),
  startUpdate: async (): Promise<boolean> => (native ? native.startUpdate().catch(() => false) : false),
  completeUpdate: async (): Promise<void> => {
    await native?.completeUpdate();
  },
  requestReview: async (): Promise<boolean> => (native ? native.requestReview().catch(() => false) : false),
  onUpdateState: (cb: (e: UpdateState) => void): { remove: () => void } =>
    native ? native.addListener('updateState', cb) : { remove: () => undefined },
};
