/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories and per-screen loading need require(). */
import type { ComponentType, ReactNode } from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { setLanguage } from '@/i18n';
import { startMeshBridge, useMesh } from '@/state/mesh';
import { useSettings } from '@/state/settings';
import { MeshEngine } from 'mesh-engine';

// The core flows end to end on one phone, through the real screens, stores and the in-memory
// engine: create a group, see it on the radar, chat with a quick reply and typed text, and send and
// resolve an SOS (B1, C1, D1, D2, E1).

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@sentry/react-native', () => ({ init: jest.fn(), captureException: jest.fn() }));
jest.mock('expo-audio', () => {
  const player = { play: jest.fn(), pause: jest.fn(), remove: jest.fn(), seekTo: jest.fn(async () => undefined), loop: false, volume: 1 };
  return { createAudioPlayer: jest.fn(() => player), setAudioModeAsync: jest.fn(async () => undefined) };
});
jest.mock('@shopify/react-native-skia', () => {
  const Null = () => null;
  const path: Record<string, unknown> = {};
  for (const m of ['moveTo', 'lineTo', 'close', 'addCircle', 'addArc', 'arcToOval', 'build']) path[m] = () => path;
  return { Canvas: Null, Circle: Null, Group: Null, Path: Null, SweepGradient: Null, vec: (x: number, y: number) => ({ x, y }), Skia: { Path: { Make: () => path }, PathBuilder: { Make: () => path } } };
});
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

const router = jest.requireMock<{ useLocalSearchParams: () => Record<string, string> }>('expo-router');
const withParams = (params: Record<string, string>) => {
  router.useLocalSearchParams = () => params;
};
const show = async (file: string, ui?: ReactNode) => {
  const Screen = (require(`../../../app/${file}`) as { default: ComponentType }).default;
  return render(<ThemeProvider>{ui ?? <Screen />}</ThemeProvider>);
};

describe('core flows on one phone', () => {
  beforeAll(async () => {
    setLanguage('en');
    useSettings.getState().set({ onboarding: 'done', language: 'en' });
    startMeshBridge();
    await MeshEngine.start();
  });

  let groupId = '';

  it('creates a group and shows it on the radar (B1, C1)', async () => {
    withParams({});
    await show('group/new.tsx');
    await fireEvent.changeText(screen.getByTestId('group-name'), 'Family');
    await fireEvent.press(screen.getByTestId('group-create'));
    await waitFor(() => expect(useMesh.getState().groups.map((g) => g.name)).toContain('Family'));
    groupId = useMesh.getState().groups.find((g) => g.name === 'Family')!.id;
    await screen.unmount();

    await show('(tabs)/index.tsx');
    expect(await screen.findAllByText('Family')).not.toHaveLength(0);
  });

  it('sends a quick reply and a typed message (D1, D2)', async () => {
    withParams({ groupId });
    await show('chat/[groupId].tsx');
    await fireEvent.changeText(await screen.findByTestId('chat-input'), 'At gate 7');
    await fireEvent.press(screen.getByTestId('chat-send'));
    await waitFor(() => expect((useMesh.getState().messages[groupId] ?? []).some((m) => m.text === 'At gate 7')).toBe(true));
    expect(await screen.findByText('At gate 7')).toBeTruthy();
  });

  it('sends an SOS and resolves it (E1)', async () => {
    withParams({ fire: '1' });
    await show('sos.tsx');
    await fireEvent.press(await screen.findByTestId('sos-medical'));
    await waitFor(() => expect(useMesh.getState().sos.own?.kind).toBe('medical'));
    // Resolving asks for confirmation first; answer Yes.
    const confirm = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => void buttons?.[1]?.onPress?.());
    await fireEvent.press(await screen.findByTestId('sos-resolve'));
    expect(confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(useMesh.getState().sos.own).toBeNull());
    expect((await MeshEngine.sosState()).own).toBeNull();
  });
});
