import type { ConfigContext, ExpoConfig } from 'expo/config';

// DEC-001: display name "Mesh Radar". The Android package is permanent after the first Play upload.
// Mesh permissions, the foreground service and receivers live in the engine module's manifest
// (modules/mesh-engine/android/src/main/AndroidManifest.xml) and merge into the app manifest.
const ANDROID_PACKAGE = 'com.meshradar.findgroupoffline';
/** EAS project @rohanic/mesh-radar (public, from `eas init`). */
const EAS_PROJECT_ID = '8169fd0b-b16d-4edc-ae69-2f873dc75f02';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Mesh Radar',
  slug: 'mesh-radar',
  owner: 'rohanic',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'meshradar',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  android: {
    package: ANDROID_PACKAGE,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#060B16',
      foregroundImage: './assets/images/adaptive-icon.png',
      monochromeImage: './assets/images/monochrome-icon.png',
    },
    permissions: ['android.permission.INTERNET', 'android.permission.VIBRATE'],
    // Section 9: never request background location or battery-optimisation exemption; no exact
    // alarms; no microphone (audio quick replies are pre-recorded clips).
    blockedPermissions: [
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      // Added by libraries but unused: Find mode sets only its own window brightness, and the app
      // sends local notifications only (no push), so Firebase messaging never needs to register.
      'android.permission.WRITE_SETTINGS',
      'com.google.android.c2dm.permission.RECEIVE',
    ],
    // Keys stay in the Android Keystore; a restored backup could not open them anyway.
    allowBackup: false,
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: 'VIEW',
        data: [{ scheme: 'meshradar' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-sqlite',
    [
      'expo-localization',
      { supportsRTL: true, supportedLocales: ['en', 'ur', 'ar', 'hi', 'bn', 'id', 'ms', 'tr'] },
    ],
    [
      'expo-splash-screen',
      {
        // Navy in both modes so the neon logo never sits on white.
        backgroundColor: '#060B16',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
        dark: { backgroundColor: '#060B16', image: './assets/images/splash-icon.png' },
      },
    ],
    ['expo-notifications', { color: '#00987F', icon: './assets/images/notification-icon.png' }],
    [
      'expo-camera',
      {
        cameraPermission: 'Mesh Radar uses the camera only to scan group and lost-child QR codes.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Mesh Radar uses your photos only when you pick an avatar or share a moment.',
        cameraPermission: 'Mesh Radar uses the camera only when you take an avatar or moment photo.',
        microphonePermission: false,
      },
    ],
    // Google Play only (section 9); pinned so the store never depends on a connected device.
    ['expo-iap', { android: { store: 'play' } }],
    [
      'expo-build-properties',
      {
        android: {
          // Expo SDK 58 libraries require compileSdk 37 (their AAR metadata check fails on 36).
          compileSdkVersion: 37,
          targetSdkVersion: 36,
          // Android 8.0: BLE extended advertising (PRD section 9, device compatibility).
          minSdkVersion: 26,
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    licencePublicKey: process.env.EXPO_PUBLIC_LICENCE_PUBLIC_KEY ?? '',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? '',
    androidPackage: ANDROID_PACKAGE,
    playStoreUrl: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
    eas: { projectId: EAS_PROJECT_ID },
  },
});
