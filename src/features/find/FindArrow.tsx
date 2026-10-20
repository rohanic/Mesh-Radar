import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/core/theme/ThemeProvider';

/** Find-mode arrow (section 7): one large arrow that turns smoothly with the compass. */
export function FindArrow({ angle, size }: { angle: number; size: number }) {
  const theme = useTheme();
  const rot = useSharedValue(angle);
  useEffect(() => {
    // Turn the short way round.
    const cur = rot.value;
    let delta = ((angle - cur) % 360 + 540) % 360 - 180;
    if (Math.abs(delta) < 0.5) delta = 0;
    rot.value = theme.reduceMotion ? cur + delta : withTiming(cur + delta, { duration: 150, easing: Easing.out(Easing.quad) });
  }, [angle, rot, theme.reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M50 4 L84 86 L50 68 L16 86 Z" fill={theme.colors.primary} stroke={theme.colors.text} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

/** Background pulse that speeds up as distance falls; static when animations are off. */
export function Pulse({ intervalMs, color, size }: { intervalMs: number; color: string; size: number }) {
  const theme = useTheme();
  const s = useSharedValue(0);
  useEffect(() => {
    if (theme.reduceMotion) {
      s.value = 0.5;
      return;
    }
    const half = Math.max(120, (intervalMs || 300) / 2);
    s.value = withRepeat(withSequence(withTiming(1, { duration: half }), withTiming(0, { duration: half })), -1, false);
  }, [intervalMs, s, theme.reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: 0.08 + s.value * 0.22, transform: [{ scale: 0.85 + s.value * 0.15 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}
