import Constants from 'expo-constants';

interface Extra {
  licencePublicKey?: string;
  apiBaseUrl?: string;
  androidPackage?: string;
  playStoreUrl?: string;
}

/** Public build-time config from app.config.ts (never secrets). */
export const extra: Extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** The Android application ID (DEC-001), from app.config.ts. */
export const ANDROID_PACKAGE = Constants.expoConfig?.android?.package ?? extra.androidPackage ?? '';

/** The Play Store page, for invites and the missing-engine notice. */
export const PLAY_STORE_URL = extra.playStoreUrl || `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
