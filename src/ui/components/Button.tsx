import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/core/theme/ThemeProvider';
import { radius, space } from '@/core/theme/tokens';
import { Icon, type IconName } from '../icons/Icon';
import { Text } from './Text';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'sos';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  big?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
  testID?: string;
}

/** Full pill buttons (section 7). The SOS variant is reserved for SOS actions. */
export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, big, style, accessibilityHint, testID }: ButtonProps) {
  const t = useTheme();
  const bg = {
    primary: t.colors.primary,
    secondary: t.colors.surfaceRaised,
    ghost: 'transparent',
    accent: t.colors.accent,
    sos: t.colors.sos,
  }[variant];
  const fg = {
    primary: t.colors.onPrimary,
    secondary: t.colors.text,
    ghost: t.colors.primary,
    accent: t.colors.onAccent,
    sos: t.colors.onSos,
  }[variant];
  const minHeight = big ? Math.max(64, t.touch + 8) : t.touch;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => {
        // Light tick for taps (section 7).
        void Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          minHeight,
          borderRadius: radius.pill,
          backgroundColor: bg,
          paddingHorizontal: space.xl,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          borderWidth: variant === 'secondary' || t.name === 'sunlight' ? 1 : 0,
          borderColor: t.colors.border,
        },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} color={fg} size={big ? 26 : 20} /> : null}
      <View style={{ flexShrink: 1 }}>
        <Text variant={big ? 'title' : 'body'} weight="bold" style={{ color: fg }} numberOfLines={2} align="center">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, tone, size = 24, testID }: { icon: IconName; label: string; onPress: () => void; tone?: string; size?: number; testID?: string }) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({ width: t.touch, height: t.touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={size} color={tone ?? t.colors.text} />
    </Pressable>
  );
}
