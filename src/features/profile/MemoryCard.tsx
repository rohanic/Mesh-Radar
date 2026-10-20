import { forwardRef, type ComponentRef } from 'react';
import { Image, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import type { Memory } from '@/core/engine/memories';
import { useTheme } from '@/core/theme/ThemeProvider';
import { radius, space } from '@/core/theme/tokens';
import { useFormat } from '@/i18n/format';
import { Text } from '@/ui/components';

/** Trip memory card (G1), drawn as a view so it can be shared as an image. */
export const MemoryCard = forwardRef<ComponentRef<typeof View>, { memory: Memory; size: number }>(function MemoryCard({ memory, size }, ref) {
  const { t } = useTranslation();
  const theme = useTheme();
  const f = useFormat();
  const r = memory.route;
  let poly = '';
  if (r.length > 1) {
    const lats = r.map((p) => p.lat);
    const lons = r.map((p) => p.lon);
    const minLat = Math.min(...lats);
    const minLon = Math.min(...lons);
    const k = Math.cos((minLat * Math.PI) / 180);
    const span = Math.max(Math.max(...lats) - minLat, (Math.max(...lons) - minLon) * k, 1e-5);
    poly = r.map((p) => `${10 + (((p.lon - minLon) * k) / span) * 80},${90 - ((p.lat - minLat) / span) * 80}`).join(' ');
  }
  return (
    <View ref={ref} collapsable={false} style={{ backgroundColor: theme.colors.surface, borderRadius: radius.card, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: theme.colors.border }}>
      {memory.cover ? <Image source={{ uri: `data:image/jpeg;base64,${memory.cover}` }} style={{ width: '100%', height: size * 0.5, borderRadius: radius.chip }} accessibilityIgnoresInvertColors /> : null}
      <Text variant="headline">{memory.title}</Text>
      <Text tone="muted">{`${f.date(memory.startMs)} - ${f.date(memory.endMs)}`}</Text>
      {poly ? (
        <Svg width={size} height={size * 0.6} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <Polyline points={poly} fill="none" stroke={theme.colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
      <Text weight="bold">{t('memories.walked', { distance: f.distance(memory.distanceM) })}</Text>
      {memory.places.length ? <Text>{`${t('memories.places')}: ${memory.places.join(', ')}`}</Text> : null}
      {memory.members.length ? <Text>{t('memories.with', { names: memory.members.join(', ') })}</Text> : null}
      <Text variant="caption" tone="muted">
        {`${t('memories.moments', { count: memory.momentCount })}. ${t('app.name')}`}
      </Text>
    </View>
  );
});
