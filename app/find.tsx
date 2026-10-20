import { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import * as Brightness from 'expo-brightness';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isArrived, pulseIntervalMs } from '@/core/engine/find';
import { freshness } from '@/core/engine/freshness';
import { bearingDeg, distanceM, relativeBearing } from '@/core/engine/geo';
import { useTheme } from '@/core/theme/ThemeProvider';
import { space } from '@/core/theme/tokens';
import { FindArrow, Pulse } from '@/features/find/FindArrow';
import { requestUwb } from '@/features/permissions/permissions';
import { playChime } from '@/features/sound/sound';
import { track } from '@/features/telemetry/telemetry';
import { useFormat } from '@/i18n/format';
import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { recordRegroup } from '@/state/social';
import { Button, Notice, Text } from '@/ui/components';
import { useNow } from '@/ui/useNow';

/** Find mode (C4, flow 2): full-screen arrow, distance in 56 sp, haptic pulses, sunlight brightness. */
export default function FindScreen() {
  useKeepAwake();
  const { t } = useTranslation();
  const theme = useTheme();
  const f = useFormat();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ group?: string; member?: string; lat?: string; lon?: string; label?: string }>();
  const own = useMesh((s) => s.own);
  const heading = useMesh((s) => s.heading);
  const member = useMesh((s) => (params.group ? s.details[params.group]?.members.find((m) => m.id === params.member) : undefined));
  const uwb = useMesh((s) => s.uwb);
  const [uwbSupported, setUwbSupported] = useState(false);
  const arrivedOnce = useRef(false);
  const start = useRef(0);
  const now = useNow(1_000);

  const target = member?.position ?? (params.lat && params.lon ? { lat: Number(params.lat), lon: Number(params.lon), fixTimeMs: now } : null);
  const name = member?.name ?? params.label ?? '';
  const gpsDistance = own && target ? distanceM(own, target) : null;
  const uwbDistance = uwb?.state === 'ranging' && uwb.memberId === member?.id ? uwb.distanceM ?? null : null;
  const distance = uwbDistance ?? gpsDistance;
  const angle = own && target ? (uwbDistance != null && uwb?.azimuth != null ? uwb.azimuth : relativeBearing(bearingDeg(own, target), heading ?? 0)) : 0;
  const interval = distance != null ? pulseIntervalMs(distance) : 2000;
  const arrived = distance != null && isArrived(distance);
  const stale = member ? freshness(Math.max(member.lastHeardMs, member.position?.fixTimeMs ?? 0), now) : null;

  // Full brightness for sunlight (C4) and the compass on while this screen is open.
  useEffect(() => {
    let previous: number | null = null;
    void Brightness.getBrightnessAsync().then((b) => {
      previous = b;
      void Brightness.setBrightnessAsync(1);
    });
    void MeshEngine.setHeadingActive(true);
    void MeshEngine.uwbSupported().then(setUwbSupported);
    start.current = Date.now();
    track('find_started', {});
    return () => {
      if (previous != null) void Brightness.setBrightnessAsync(previous);
      void MeshEngine.stopUwb();
    };
  }, []);

  // Haptic pulses that speed up; continuous under 10 m (flow 2, step 4).
  const hasDistance = distance != null;
  useEffect(() => {
    if (!hasDistance) return;
    if (interval === 0) {
      const id = setInterval(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 120);
      return () => clearInterval(id);
    }
    const id = setInterval(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), interval);
    return () => clearInterval(id);
  }, [interval, hasDistance]);

  useEffect(() => {
    if (!arrived || arrivedOnce.current) return;
    arrivedOnce.current = true;
    void playChime();
    recordRegroup();
    track('regroup_success', { durationSec: Math.round((Date.now() - start.current) / 1000) });
    // Chime on their phone too (flow 2, step 4).
    if (params.group && member) void MeshEngine.sendChat({ groupId: params.group, recipientId: member.id, kind: 'system', text: 'arrived', quickCode: 0 }).catch(() => undefined);
  }, [arrived, member, params.group]);

  const big = Math.min(width * 0.7, 320);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg, padding: space.lg, gap: space.lg }}>
      <Text variant="title" align="center" accessibilityRole="header">
        {t('find.title', { name })}
      </Text>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Pulse intervalMs={interval} color={arrived ? theme.colors.success : theme.colors.primary} size={big * 1.25} />
        {arrived ? null : <FindArrow angle={angle} size={big} />}
      </View>
      <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: space.sm }}>
        <Text variant="findDistance" align="center" tabular accessibilityLabel={distance != null ? f.distance(distance) : t('radar.noFix')}>
          {distance != null ? f.distance(distance) : '...'}
        </Text>
        <Text align="center" weight="bold" tone={arrived ? 'success' : 'default'}>
          {arrived ? t('find.arrived') : t('find.far')}
        </Text>
        {arrived ? <Text align="center">{t('find.arrivedBody')}</Text> : null}
        {stale && stale.state !== 'live' ? <Notice tone="warning" text={t('find.stale', { time: t(stale.labelKey, { count: stale.minutes }) })} /> : null}
        {uwbDistance != null ? <Text tone="primary">{t('find.uwbOn', { distance: f.distance(uwbDistance) })}</Text> : null}
      </View>
      {uwbSupported && member && params.group && uwb?.state !== 'ranging' && gpsDistance != null && gpsDistance < 60 ? (
        <Button
          variant="secondary"
          icon="crosshair"
          label={t('find.uwb')}
          onPress={async () => {
            if (await requestUwb()) await MeshEngine.startUwb(params.group!, member.id);
          }}
        />
      ) : null}
      <Button label={t('find.done')} variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </SafeAreaView>
  );
}
