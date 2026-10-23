import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ComponentType, ReactNode } from 'react';
import { PermissionsAndroid } from 'react-native';
import { render } from '@testing-library/react-native';

import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { setLanguage } from '@/i18n';
import { useSettings } from '@/state/settings';

// Every screen renders with the in-memory engine and no route params, in light and dark, without
// throwing and without an update loop. This caught the zustand selector loop that blanked the
// Radar tab (bc55e9e) only after a run on a device; now it is caught on every test run.

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Skia draws the radar natively; in tests its components render nothing.
jest.mock('@shopify/react-native-skia', () => {
  const Null = () => null;
  const path: Record<string, unknown> = {};
  for (const m of ['moveTo', 'lineTo', 'close', 'addCircle', 'addArc', 'arcToOval', 'build']) path[m] = () => path;
  return {
    Canvas: Null,
    Circle: Null,
    Group: Null,
    Path: Null,
    SweepGradient: Null,
    vec: (x: number, y: number) => ({ x, y }),
    Skia: { Path: { Make: () => path }, PathBuilder: { Make: () => path }, XYWHRect: (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h }) },
  };
});

// Opt-in crash reports and the bundled sounds are native; tests only need them to exist.
jest.mock('@sentry/react-native', () => ({ init: jest.fn(), captureException: jest.fn() }));
jest.mock('expo-audio', () => {
  const player = { play: jest.fn(), pause: jest.fn(), remove: jest.fn(), seekTo: jest.fn(async () => undefined), loop: false, volume: 1 };
  return { createAudioPlayer: jest.fn(() => player), setAudioModeAsync: jest.fn(async () => undefined) };
});

// Animations run on the UI thread; in tests values are plain and animations end at once.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const ease = () => 0;
  return {
    __esModule: true,
    default: { View },
    Easing: { linear: ease, ease, in: () => ease, out: () => ease, inOut: () => ease, bezier: () => ease },
    useSharedValue: (value: unknown) => ({ value }),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (to: unknown) => to,
    withRepeat: (to: unknown) => to,
    withSequence: (...steps: unknown[]) => steps[steps.length - 1],
    cancelAnimation: () => undefined,
  };
});
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
}));
Object.assign(PermissionsAndroid, {
  check: jest.fn(async () => true),
  request: jest.fn(async () => 'granted'),
  requestMultiple: jest.fn(async (list: string[]) => Object.fromEntries(list.map((p) => [p, 'granted']))),
});

const APP = join(__dirname, '../../../app');

function routes(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...routes(p));
    else if (name.endsWith('.tsx') && !name.startsWith('_') && !name.includes('.test.')) out.push(p);
  }
  return out.sort();
}

const wrap = (ui: ReactNode) => <ThemeProvider>{ui}</ThemeProvider>;

const LOOP = /Maximum update depth|getSnapshot should be cached/;

describe.each(['light', 'dark'] as const)('every screen renders (%s)', (theme) => {
  beforeAll(() => {
    setLanguage('en');
    useSettings.getState().set({ theme, onboarding: 'done', language: 'en' });
  });

  it.each(routes(APP).map((f) => [relative(APP, f), f]))('%s', async (_name, file) => {
    const errors: string[] = [];
    const spy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => void errors.push(args.map(String).join(' ')));
    try {
      const Screen = (require(file) as { default: ComponentType }).default;
      const view = await render(wrap(<Screen />));
      expect(view.toJSON()).not.toBeUndefined();
      await view.unmount();
    } finally {
      spy.mockRestore();
    }
    expect(errors.filter((e) => LOOP.test(e))).toEqual([]);
  });
});
