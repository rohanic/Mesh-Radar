import { useEffect, useState } from 'react';
import { I18nManager, LogBox, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { getLocales } from 'expo-localization';
import { reloadAppAsync } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { ThemeProvider, useTheme } from '@/core/theme/ThemeProvider';
import { AlertHost } from '@/features/alerts/AlertHost';
import { bootEngine, refreshStrings } from '@/features/engine/boot';
import { EngineMissing } from '@/features/engine/EngineMissing';
import { StorePrompts } from '@/features/store/StorePrompts';
import { startTelemetry } from '@/features/telemetry/telemetry';
import { setLanguage } from '@/i18n';
// Importing '@/i18n' also initialises i18next before the first render.
import { FONT_ASSETS } from '@/i18n/fonts';
import { language, matchDeviceLanguage } from '@/i18n/languages';
import { useSettings } from '@/state/settings';
import { SosButton } from '@/ui/components/SosButton';
import { useFloatingSos } from '@/ui/floatingSos';
import { isNativeEngine } from 'mesh-engine';

void SplashScreen.preventAutoHideAsync();

// Expo Go has no notifications or Google Play Billing; its warnings about them are expected there
// and never appear in the real app, so they stay out of the way of real errors.
if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) LogBox.ignoreLogs(['expo-notifications', '[Expo-IAP]']);

/** Release builds never run on the in-memory fake engine (DEC-042). */
const ENGINE_MISSING = !__DEV__ && !isNativeEngine;

function FloatingSos() {
  const visible = useFloatingSos();
  const { bottom } = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 84 + bottom, alignItems: 'center' }}>
      <SosButton onFire={() => router.push('/sos?fire=1')} />
    </View>
  );
}

function Shell() {
  const t = useTheme();
  if (ENGINE_MISSING) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <StatusBar style={t.dark ? 'light' : 'dark'} />
        <EngineMissing />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg }, animation: t.reduceMotion ? 'none' : 'default' }} />
      <FloatingSos />
      <StorePrompts />
      <AlertHost />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONT_ASSETS);
  const code = useSettings((s) => s.language);
  const [booted, setBooted] = useState(ENGINE_MISSING);

  // Language and reading direction (section 7: Urdu and Arabic flip with I18nManager).
  useEffect(() => {
    const lang = language(code ?? matchDeviceLanguage(getLocales().map((l) => l.languageTag)));
    setLanguage(lang.code);
    void refreshStrings().catch(() => undefined);
    if (code && I18nManager.isRTL !== lang.rtl) {
      I18nManager.allowRTL(lang.rtl);
      I18nManager.forceRTL(lang.rtl);
      void reloadAppAsync('Reading direction changed');
    }
  }, [code]);

  useEffect(() => {
    if (ENGINE_MISSING) return;
    bootEngine()
      .catch(() => undefined)
      .finally(() => setBooted(true));
    startTelemetry();
  }, []);

  useEffect(() => {
    if (fontsLoaded && booted) void SplashScreen.hideAsync();
  }, [fontsLoaded, booted]);

  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Shell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
