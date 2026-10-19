import type { ConfigContext, ExpoConfig } from 'expo/config';

// DEC-001: display name "Mesh Radar", package com.rohanic.meshradar (permanent after first Play upload).
// Mesh permissions, the foreground service and receivers live in the engine module's manifest
// (modules/mesh-engine/android/src/main/AndroidManifest.xml) and merge into the app manifest.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Mesh Radar',
  slug: 'mesh-radar',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'meshradar',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  android: {
    package: 'com.rohanic.meshradar',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#070C17',
      foregroundImage: './assets/images/adaptive-icon.png',
      monochromeImage: './assets/images/adaptive-icon.png',
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
        backgroundColor: '#F6F8FB',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
        dark: { backgroundColor: '#070C17', image: './assets/images/splash-icon.png' },
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
    'expo-iap',
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
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
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.rohanic.meshradar',
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
