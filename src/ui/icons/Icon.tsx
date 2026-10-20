import { I18nManager } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { ICONS, type IconName } from './registry';

export type { IconName } from './registry';

/** Icons that point somewhere flip in right-to-left layouts (section 7); the radar does not. */
const DIRECTIONAL: IconName[] = ['chevron-left', 'chevron-right', 'send', 'log-out'];

export function Icon({ name, size = 22, color, strokeWidth = 2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const { colors } = useTheme();
  const Cmp = ICONS[name];
  const flip = I18nManager.isRTL && DIRECTIONAL.includes(name);
  return <Cmp size={size} color={color ?? colors.text} strokeWidth={strokeWidth} style={flip ? { transform: [{ scaleX: -1 }] } : undefined} />;
}
