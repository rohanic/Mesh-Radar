import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme/ThemeProvider';
import { space } from '@/core/theme/tokens';
import { useSettings } from '@/state/settings';
import { Button, Screen, Text } from '@/ui/components';
import { Icon, type IconName } from '@/ui/icons/Icon';

const SLIDES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'radar', title: 'onboarding.welcome1Title', body: 'onboarding.welcome1Body' },
  { icon: 'route', title: 'onboarding.welcome2Title', body: 'onboarding.welcome2Body' },
  { icon: 'siren', title: 'onboarding.welcome3Title', body: 'onboarding.welcome3Body' },
];

export default function Welcome() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [i, setI] = useState(0);
  const set = useSettings((s) => s.set);
  const slide = SLIDES[i]!;
  const next = () => {
    if (i < SLIDES.length - 1) setI(i + 1);
    else {
      set({ onboarding: 'profile' });
      router.replace('/onboarding/profile');
    }
  };
  return (
    <Screen
      scroll={false}
      footer={
        <>
          <Button testID="welcome-next" label={t('common.continue')} onPress={next} />
          <Text variant="caption" tone="muted" align="center">
            {t('app.notEmergencyService')}
          </Text>
        </>
      }>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl }}>
        <View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={slide.icon} size={80} color={slide.icon === 'siren' ? theme.colors.sos : theme.colors.primary} />
        </View>
        <Text variant="headline" align="center" accessibilityRole="header">
          {t(slide.title)}
        </Text>
        <Text align="center" tone="muted">
          {t(slide.body)}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm }} accessibilityLabel={`${i + 1} / ${SLIDES.length}`}>
          {SLIDES.map((_, k) => (
            <View key={k} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: k === i ? theme.colors.primary : theme.colors.border }} />
          ))}
        </View>
      </View>
    </Screen>
  );
}
