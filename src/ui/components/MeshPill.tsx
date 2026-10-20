import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme/ThemeProvider';
import { radius, space } from '@/core/theme/tokens';
import { useFormat } from '@/i18n/format';
import { Icon } from '../icons/Icon';
import { Text } from './Text';

/** Mesh health pill (section 7): "12 phones nearby, 3 hops" with a small signal glyph. */
export function MeshPill({ running, neighbours, hops, onPress }: { running: boolean; neighbours: number; hops: number; onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const f = useFormat();
  const tone = !running ? theme.colors.warning : neighbours > 0 ? theme.colors.success : theme.colors.textMuted;
  const label = !running ? t('mesh.off') : t('mesh.pill', { phones: f.number(neighbours), hops: f.number(hops), count: neighbours });
  return (
    <Pressable
      testID="mesh-pill"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, minHeight: 36, borderRadius: radius.pill, backgroundColor: theme.colors.surfaceRaised, borderWidth: 1, borderColor: theme.colors.border }}>
      <Icon name={running ? 'signal' : 'power'} size={16} color={tone} />
      <Text variant="bodySmall" weight="bold" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
