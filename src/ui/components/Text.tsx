import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import type { TypeVariant } from '@/core/theme/tokens';

export interface Props extends TextProps {
  variant?: TypeVariant;
  weight?: 'regular' | 'bold';
  tone?: 'default' | 'muted' | 'primary' | 'accent' | 'sos' | 'warning' | 'success' | 'onPrimary' | 'onSos';
  align?: TextStyle['textAlign'];
  /** Distances use tabular numbers (section 7). */
  tabular?: boolean;
}

export function Text({ variant = 'body', weight, tone = 'default', align, tabular, style, ...rest }: Props) {
  const t = useTheme();
  const size = t.size(variant);
  const bold = weight ? weight === 'bold' : ['title', 'headline', 'distance', 'findDistance'].includes(variant);
  const color = {
    default: t.colors.text,
    muted: t.colors.textMuted,
    primary: t.colors.primary,
    accent: t.colors.accent,
    sos: t.colors.sos,
    warning: t.colors.warning,
    success: t.colors.success,
    onPrimary: t.colors.onPrimary,
    onSos: t.colors.onSos,
  }[tone];
  return (
    <RNText
      // Support system font scaling up to 200 percent (section 7).
      maxFontSizeMultiplier={2}
      style={[
        {
          color,
          fontSize: size,
          lineHeight: Math.round(size * t.fonts.lineHeight),
          fontFamily: bold ? t.fonts.bold : t.fonts.regular,
          textAlign: align,
          writingDirection: t.rtl ? 'rtl' : 'ltr',
          fontVariant: tabular ? ['tabular-nums'] : undefined,
        },
        style,
      ]}
      {...rest}
    />
  );
}
