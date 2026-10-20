import Constants from 'expo-constants';

interface Extra {
  licencePublicKey?: string;
  apiBaseUrl?: string;
  playStoreUrl?: string;
}

/** Public build-time config from app.config.ts (never secrets). */
export const extra: Extra = (Constants.expoConfig?.extra ?? {}) as Extra;
