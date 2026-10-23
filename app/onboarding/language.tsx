import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { getLocales } from 'expo-localization';

import { useTheme } from '@/core/theme/ThemeProvider';
import { radius, space } from '@/core/theme/tokens';
import { fontsFor } from '@/i18n/fonts';
import { LANGUAGES, matchDeviceLanguage } from '@/i18n/languages';
import { resources } from '@/i18n';
import { useSettings } from '@/state/settings';
import { Screen, Text } from '@/ui/components';
import { Icon } from '@/ui/icons/Icon';

/** A2: the very first screen. Every language is selectable before any other text appears. */
export default function LanguageScreen() {
  const theme = useTheme();
  const set = useSettings((s) => s.set);
  const current = useSettings((s) => s.language) ?? matchDeviceLanguage(getLocales().map((l) => l.languageTag));
  return (
    <Screen testID="language-screen">
      <View style={{ alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
        <Icon name="languages" size={40} color={theme.colors.primary} />
      </View>
      {LANGUAGES.map((l) => {
        const f = fontsFor(l.script);
        const selected = l.code === current;
        const title = (resources[l.code].translation as { onboarding: { languageTitle: string } }).onboarding.languageTitle;
        return (
          <Pressable
            key={l.code}
            testID={`lang-${l.code}`}
            accessibilityRole="button"
            accessibilityLabel={`${l.native}, ${l.english}`}
            accessibilityState={{ selected }}
            onPress={() => {
              set({ language: l.code, numerals: l.defaultNumerals, onboarding: 'welcome' });
              router.replace('/onboarding/welcome');
            }}
            style={({ pressed }) => ({
              minHeight: 64,
              borderRadius: radius.card,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? theme.colors.primary : theme.colors.border,
              backgroundColor: theme.colors.surface,
              padding: space.lg,
              flexDirection: l.rtl ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: space.md,
              opacity: pressed ? 0.8 : 1,
            })}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
              <Text weight="bold" tone={selected ? 'primary' : 'default'}>
                {l.code.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: l.rtl ? 'flex-end' : 'flex-start' }}>
              <Text style={{ fontFamily: f.bold, fontSize: 22, lineHeight: Math.round(22 * f.lineHeight), writingDirection: l.rtl ? 'rtl' : 'ltr' }}>{l.native}</Text>
              <Text variant="bodySmall" tone="muted" style={{ fontFamily: f.regular, writingDirection: l.rtl ? 'rtl' : 'ltr' }}>
                {title}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}
