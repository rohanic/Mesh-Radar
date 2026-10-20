import { useEffect, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Canvas, Circle, Group, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import type { LatLon } from '@/core/engine/geo';
import { relativeDirection } from '@/core/engine/geo';
import { project } from '@/core/engine/radar';
import { useTheme } from '@/core/theme/ThemeProvider';
import { motion } from '@/core/theme/tokens';
import { useFormat } from '@/i18n/format';
import { Avatar } from '@/ui/components/Avatar';
import { Text } from '@/ui/components';
import { useNow } from '@/ui/useNow';

export interface RadarMember {
  id: string;
  name: string;
  colour: number;
  avatarPreset: number;
  avatarPhoto?: string | null;
  position: LatLon | null;
  lastMs: number;
  accuracyM: number;
  sos?: boolean;
}

export interface RadarPin extends LatLon {
  id: string;
  name: string;
}

/**
 * Radar canvas (C1, C2, section 7): rings at 25/50/100/250 m with auto-zoom, a slow 4-second
 * sweep, blips with accuracy halos, meeting points and Last-Crumb pins. Avatars are native views
 * on top so TalkBack can reach each person. North is north in every language (no RTL mirroring).
 */
export function RadarCanvas({
  own,
  heading,
  members,
  pins,
  crumbs,
  size,
  sweep = true,
  onSelect,
  demo,
}: {
  own: LatLon | null;
  heading: number | null;
  members: RadarMember[];
  pins: RadarPin[];
  crumbs: RadarPin[];
  size: number;
  sweep?: boolean;
  onSelect?: (id: string) => void;
  demo?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const f = useFormat();
  const now = useNow(5_000);
  const half = size / 2;
  const R = half - 28;

  // Projection is cheap; the React Compiler memoises this render (DEC-033).
  const located = members.filter((m) => m.position);
  const view = own ? project(own, heading, located.map((m) => ({ id: m.id, position: m.position!, accuracyM: m.accuracyM, lastMs: m.lastMs })), now) : null;
  const pinView = own && view ? project(own, heading, [...pins, ...crumbs].map((p) => ({ id: p.id, position: p, accuracyM: 0, lastMs: now })), now, view.rangeM) : null;

  const spin = useSharedValue(0);
  const animate = sweep && !theme.reduceMotion;
  useEffect(() => {
    if (!animate) {
      cancelAnimation(spin);
      return;
    }
    spin.value = 0;
    spin.value = withRepeat(withTiming(1, { duration: motion.sweepMs, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(spin);
  }, [animate, spin]);
  const sweepTransform = useDerivedValue(() => [{ rotate: spin.value * 2 * Math.PI }]);

  const wedge = useMemo(
    () => Skia.PathBuilder.Make().moveTo(0, 0).arcToOval({ x: -R, y: -R, width: 2 * R, height: 2 * R }, -90, 60, false).close().build(),
    [R],
  );

  const northTick = useMemo(() => Skia.PathBuilder.Make().moveTo(0, -R - 14).lineTo(-6, -R - 4).lineTo(6, -R - 4).close().build(), [R]);

  const rotation = ((view?.rotation ?? -(heading ?? 0)) * Math.PI) / 180;
  const sweepColor = theme.colors.radarSweep;

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={t('radar.title')}>
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ translateX: half }, { translateY: half }]}>
          <Circle cx={0} cy={0} r={R} color={theme.colors.surface} />
          {(view?.rings ?? [{ metres: 25, r: 1 }]).map((ring) => (
            <Circle key={ring.metres} cx={0} cy={0} r={ring.r * R} color={theme.colors.radarRing} style="stroke" strokeWidth={1.5} />
          ))}
          {animate ? (
            <Group transform={sweepTransform}>
              <Path path={wedge}>
                <SweepGradient c={vec(0, 0)} colors={[`${sweepColor}00`, `${sweepColor}00`, `${sweepColor}55`]} positions={[0, 0.75, 0.9167]} />
              </Path>
            </Group>
          ) : null}
          <Group transform={[{ rotate: rotation }]}>
            <Path path={northTick} color={theme.colors.sos} />
          </Group>
          {view?.blips.map((b) =>
            b.halo > 0.01 ? (
              <Circle key={`h${b.id}`} cx={b.x * R} cy={b.y * R} r={b.halo * R} color={theme.groupColour(members.find((m) => m.id === b.id)?.colour ?? 0).color} opacity={0.18 * b.freshness.opacity} />
            ) : null,
          )}
          {pinView?.blips.map((b) => {
            const crumb = crumbs.some((c) => c.id === b.id);
            const x = b.x * R;
            const y = b.y * R;
            const p = Skia.PathBuilder.Make().moveTo(x, y - 9).lineTo(x + 9, y).lineTo(x, y + 9).lineTo(x - 9, y).close().build();
            return <Path key={`p${b.id}`} path={p} color={crumb ? theme.colors.warning : theme.colors.accent} />;
          })}
          <Circle cx={0} cy={0} r={7} color={theme.colors.primary} />
        </Group>
      </Canvas>
      {/* Avatars as native views for touch and screen readers. */}
      {view?.blips.map((b) => {
        const m = members.find((x) => x.id === b.id)!;
        const avatar = 40;
        const label = t('radar.a11yMember', {
          name: m.name,
          distance: f.distance(b.distanceM),
          direction: t(`direction.${relativeDirection(b.relative)}`),
          freshness: b.freshness.labelKey === 'freshness.now' ? t('freshness.now') : t(b.freshness.labelKey, { count: b.freshness.minutes }),
        });
        return (
          <Pressable
            key={b.id}
            testID={`blip-${m.id}`}
            accessibilityRole="button"
            accessibilityLabel={label}
            disabled={demo || !onSelect}
            onPress={() => onSelect?.(m.id)}
            style={{ position: 'absolute', left: half + b.x * R - avatar / 2, top: half + b.y * R - avatar / 2, alignItems: 'center' }}>
            <View style={m.sos ? { borderRadius: avatar, borderWidth: 3, borderColor: theme.colors.sos } : undefined}>
              <Avatar preset={m.avatarPreset} photo={m.avatarPhoto} colour={m.colour} size={avatar} dim={b.freshness.state === 'lost'} />
            </View>
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 8, paddingHorizontal: 4, marginTop: 2, opacity: b.freshness.opacity }}>
              <Text variant="caption" weight="bold" numberOfLines={1} tabular>
                {b.beyond ? f.distance(b.distanceM) : m.name.split(' ')[0]}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {view ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: 4, bottom: 4 }}>
          <Text variant="caption" tone="muted" tabular>
            {f.distance(view.rangeM)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
