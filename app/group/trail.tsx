import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { walkedMetres } from '@/core/engine/memories';
import { useTheme } from '@/core/theme/ThemeProvider';
import { useFormat } from '@/i18n/format';
import { MeshEngine, type Breadcrumb } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { Card, Header, Notice, Screen, Text } from '@/ui/components';

/** Breadcrumbs (C7): the last 2 hours of a member's path, stored on this phone. */
export default function Trail() {
  const { t } = useTranslation();
  const theme = useTheme();
  const f = useFormat();
  const { width } = useWindowDimensions();
  const { id, member } = useLocalSearchParams<{ id: string; member: string }>();
  const m = useMesh((s) => s.details[id]?.members.find((x) => x.id === member));
  const [points, setPoints] = useState<Breadcrumb[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    MeshEngine.breadcrumbs(id, member, Date.now() - 2 * 3_600_000)
      .then(setPoints)
      .catch(() => setError(true));
  }, [id, member]);
  const size = width - 32;
  let poly = '';
  if (points && points.length > 1) {
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const span = Math.max(maxLat - minLat, (maxLon - minLon) * Math.cos((minLat * Math.PI) / 180), 1e-5);
    poly = points.map((p) => `${16 + ((p.lon - minLon) * Math.cos((minLat * Math.PI) / 180) / span) * (size - 32)},${size - 16 - ((p.lat - minLat) / span) * (size - 32)}`).join(' ');
  }
  return (
    <Screen>
      <Header title={`${t('member.trail')}: ${m?.name ?? ''}`} />
      {error ? <Notice tone="warning" text={t('errors.needs_pass')} /> : null}
      {points && points.length > 1 ? (
        <>
          <Card>
            <Svg width={size - 32} height={size - 32} viewBox={`0 0 ${size} ${size}`} accessibilityLabel={t('member.trail')}>
              <Polyline points={poly} fill="none" stroke={theme.colors.primary} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
              <Circle cx={Number(poly.split(' ').at(-1)!.split(',')[0])} cy={Number(poly.split(' ').at(-1)!.split(',')[1])} r={8} fill={theme.colors.accent} />
            </Svg>
          </Card>
          <Text>{t('memories.walked', { distance: f.distance(walkedMetres(points.map((p) => ({ lat: p.lat, lon: p.lon, atMs: p.atMs })))) })}</Text>
        </>
      ) : (
        <View>
          <Text tone="muted">{t('member.noPosition')}</Text>
        </View>
      )}
    </Screen>
  );
}
