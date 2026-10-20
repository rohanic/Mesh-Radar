import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Switch, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme/ThemeProvider';
import { radius, space } from '@/core/theme/tokens';
import { Icon, type IconName } from '../icons/Icon';
import { IconButton } from './Button';
import { Text } from './Text';

export function Screen({ children, scroll = true, padded = true, footer, testID }: { children: ReactNode; scroll?: boolean; padded?: boolean; footer?: ReactNode; testID?: string }) {
  const t = useTheme();
  const body = scroll ? (
    <ScrollView contentContainerStyle={{ padding: padded ? space.lg : 0, gap: space.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: padded ? space.lg : 0, gap: space.lg }}>{children}</View>
  );
  return (
    <SafeAreaView testID={testID} style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        {body}
        {footer ? <View style={{ padding: space.lg, gap: space.sm }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Header({ title, back = true, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48 }}>
      {back ? <IconButton icon="chevron-left" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="headline" accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, tone, onPress, accessibilityLabel }: { children: ReactNode; style?: ViewStyle; tone?: 'raised' | 'accent' | 'sos' | 'warning'; onPress?: () => void; accessibilityLabel?: string }) {
  const t = useTheme();
  const borderColor = tone === 'sos' ? t.colors.sos : tone === 'warning' ? t.colors.warning : tone === 'accent' ? t.colors.accent : t.colors.border;
  const content = (
    <View
      style={[
        {
          backgroundColor: tone === 'raised' ? t.colors.surfaceRaised : t.colors.surface,
          borderRadius: radius.card,
          padding: space.lg,
          gap: space.sm,
          borderWidth: tone && tone !== 'raised' ? 2 : 1,
          borderColor,
          // Light mode uses one soft shadow; dark mode uses tone (section 7).
          ...(t.dark ? {} : { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 }),
        },
        style,
      ]}>
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {content}
    </Pressable>
  );
}

export function Row({ children, gap = space.sm, style }: { children: ReactNode; gap?: number; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function ListRow({ title, subtitle, icon, right, onPress, tone, testID }: { title: string; subtitle?: string; icon?: IconName; right?: ReactNode; onPress?: () => void; tone?: string; testID?: string }) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ minHeight: t.touch + 8, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, opacity: pressed ? 0.7 : 1 })}>
      {icon ? <Icon name={icon} color={tone ?? t.colors.primary} /> : null}
      <View style={{ flex: 1 }}>
        <Text weight="bold">{title}</Text>
        {subtitle ? <Text variant="bodySmall" tone="muted">{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" color={t.colors.textMuted} size={20} /> : null)}
    </Pressable>
  );
}

export function Toggle({ label, value, onChange, hint, testID }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string; testID?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: t.touch }}>
      <View style={{ flex: 1 }}>
        <Text weight="bold">{label}</Text>
        {hint ? <Text variant="bodySmall" tone="muted">{hint}</Text> : null}
      </View>
      <Switch testID={testID} accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: t.colors.primary, false: t.colors.border }} thumbColor={t.colors.surface} />
    </View>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="bodySmall" weight="bold">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={t.colors.textMuted}
        maxFontSizeMultiplier={2}
        style={{
          minHeight: t.touch,
          borderRadius: radius.chip,
          backgroundColor: t.colors.surfaceRaised,
          borderWidth: 1,
          borderColor: t.colors.border,
          paddingHorizontal: space.md,
          color: t.colors.text,
          fontSize: t.size('body'),
          fontFamily: t.fonts.regular,
          textAlign: t.rtl ? 'right' : 'left',
        }}
        {...props}
      />
      {hint ? <Text variant="caption" tone="muted">{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, icon, selected, onPress, testID }: { label: string; icon?: IconName; selected?: boolean; onPress?: () => void; testID?: string }) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: t.touch,
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        backgroundColor: selected ? t.colors.primary : t.colors.surfaceRaised,
        borderWidth: 1,
        borderColor: selected ? t.colors.primary : t.colors.border,
        opacity: pressed ? 0.8 : 1,
      })}>
      {icon ? <Icon name={icon} size={18} color={selected ? t.colors.onPrimary : t.colors.text} /> : null}
      <Text weight="bold" style={{ color: selected ? t.colors.onPrimary : t.colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Notice({ text, tone = 'info', icon }: { text: string; tone?: 'info' | 'warning' | 'sos' | 'success'; icon?: IconName }) {
  const t = useTheme();
  const color = tone === 'warning' ? t.colors.warning : tone === 'sos' ? t.colors.sos : tone === 'success' ? t.colors.success : t.colors.primary;
  return (
    <View accessibilityRole="text" style={{ flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.chip, borderWidth: 1, borderColor: color, backgroundColor: t.colors.surface }}>
      <Icon name={icon ?? (tone === 'info' ? 'info' : 'alert')} color={color} size={20} />
      <Text variant="bodySmall" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      {title ? (
        <Text variant="bodySmall" tone="muted" weight="bold" accessibilityRole="header">
          {title.toUpperCase()}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}
