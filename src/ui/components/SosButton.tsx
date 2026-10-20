import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme/ThemeProvider';
import { touch } from '@/core/theme/tokens';
import { Icon } from '../icons/Icon';
import { Text } from './Text';

export const HOLD_MS = 3_000;

/**
 * SOS button (E1, section 7): red pill, hold for 3 seconds. The ring fills with a haptic tick each
 * second; releasing early cancels. 72 dp tall.
 */
export function SosButton({ onFire, compact, testID = 'sos-button' }: { onFire: () => void; compact?: boolean; testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const ticks = useRef(0);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    start.current = null;
    ticks.current = 0;
    setProgress(0);
  };

  useEffect(() => stop, []);

  const begin = () => {
    stop();
    start.current = Date.now();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    timer.current = setInterval(() => {
      if (start.current == null) return;
      const elapsed = Date.now() - start.current;
      const p = Math.min(1, elapsed / HOLD_MS);
      setProgress(p);
      const second = Math.floor(elapsed / 1000);
      if (second > ticks.current && second < 3) {
        ticks.current = second;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      if (p >= 1) {
        stop();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onFire();
      }
    }, 50);
  };

  const size = compact ? 56 : touch.sos;
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const secondsLeft = Math.ceil(HOLD_MS / 1000 - (progress * HOLD_MS) / 1000);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t('sos.button')}
      accessibilityHint={t('sos.holdHint')}
      onPressIn={begin}
      onPressOut={() => {
        if (progress < 1) stop();
      }}
      style={{
        height: size,
        minWidth: compact ? size : 150,
        borderRadius: size / 2,
        backgroundColor: theme.colors.sos,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingHorizontal: compact ? 0 : 20,
        gap: 8,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      }}>
      <View style={{ width: size - 12, height: size - 12, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size - 12} height={size - 12} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute' }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.onSos} strokeOpacity={0.3} strokeWidth={4} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={theme.colors.onSos}
            strokeWidth={4}
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - progress)}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {progress > 0 ? (
          <Text weight="bold" style={{ color: theme.colors.onSos }} tabular>
            {secondsLeft}
          </Text>
        ) : (
          <Icon name="siren" color={theme.colors.onSos} size={compact ? 22 : 24} />
        )}
      </View>
      {compact ? null : (
        <Text variant="title" style={{ color: theme.colors.onSos }}>
          {progress > 0 ? t('sos.keepHolding') : t('sos.button')}
        </Text>
      )}
    </Pressable>
  );
}
