import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import * as Network from 'expo-network';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shouldAskForReview, type ReviewMoment } from '@/core/engine/review';
import { updateAction, type UpdateInfo } from '@/core/engine/updates';
import { useTheme } from '@/core/theme/ThemeProvider';
import { radius, space } from '@/core/theme/tokens';
import { useMesh } from '@/state/mesh';
import { usePacks } from '@/state/packs';
import { recordOpen, recordSos, usePrompts } from '@/state/prompts';
import { useSettings } from '@/state/settings';
import { useSocial } from '@/state/social';
import { Button, Row, Text } from '@/ui/components';
import { useNow } from '@/ui/useNow';
import { PlayStore, UNKNOWN_UPDATE } from 'play-store';

// In-app update banner (DEC-043) and review requests (DEC-044). Both appear only on the four tab
// screens and never while a safety moment is running, so they cannot cover SOS, an incoming alert
// or Find mode.

/** The tab screens, where a short banner does not get in the way. */
const CALM_PATHS = ['/', '/chat', '/events', '/me'];

const URGENT_ALERTS = new Set(['sos', 'publicSos', 'lostChild', 'crowd', 'checkinMissed', 'separation']);

let pendingMoment: ReviewMoment | null = null;

/** A good moment for a rating, asked later on a calm screen (never in Find mode itself). */
export function noteReviewMoment(moment: ReviewMoment) {
  pendingMoment = moment;
}

function useBusy(): boolean {
  const path = usePathname();
  const ownSos = useMesh((s) => s.sos.own != null);
  const urgent = useMesh((s) => s.alerts.some((a) => URGENT_ALERTS.has(a.kind)));
  const eventDay = usePacks((s) => s.eventDay);
  return ownSos || urgent || eventDay || !CALM_PATHS.includes(path);
}

async function online(): Promise<boolean> {
  return Network.getNetworkStateAsync()
    .then((s) => !!s.isInternetReachable)
    .catch(() => false);
}

export function StorePrompts() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const busy = useBusy();
  const meshRunning = useMesh((s) => !!s.engine?.running);
  const elderMode = useSettings((s) => s.elderMode);
  const onboarded = useSettings((s) => s.onboarding === 'done');
  const prompts = usePrompts();
  const [info, setInfo] = useState<UpdateInfo>(UNKNOWN_UPDATE);
  const asking = useRef(false);
  const now = useNow(60_000);

  // Check on launch and whenever the app comes back to the foreground.
  useEffect(() => {
    const check = () => {
      recordOpen();
      if (!PlayStore.available) return;
      void online()
        .then((on) => (on ? PlayStore.checkUpdate() : null))
        .then((next) => next && setInfo(next));
    };
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = PlayStore.onUpdateState((e) => setInfo((i) => ({ ...i, installStatus: e.status })));
    return () => sub.remove();
  }, []);

  // Remember SOS moments so nobody is asked for a rating soon after one.
  const anySos = useMesh((s) => s.sos.own != null || s.sos.incoming.length > 0);
  useEffect(() => {
    if (anySos) recordSos();
  }, [anySos]);

  // Ask for a rating once the person is back on a calm screen after a good moment.
  useEffect(() => {
    const moment = pendingMoment;
    if (!moment || busy || asking.current || !PlayStore.available) return;
    pendingMoment = null;
    const s = usePrompts.getState();
    const social = useSocial.getState();
    const stats = {
      firstOpenMs: s.firstOpenMs,
      activeDays: s.activeDays,
      regroups: social.regroups,
      drillsCompleted: social.drillsCompleted,
      lastSosMs: s.lastSosMs,
      asks: s.reviewAsks,
      lastAskMs: s.lastReviewAskMs,
    };
    if (!shouldAskForReview(stats, moment, { nowMs: Date.now(), busy, elderMode })) return;
    asking.current = true;
    void (async () => {
      if ((await online()) && (await PlayStore.requestReview())) {
        usePrompts.getState().set({ reviewAsks: s.reviewAsks + 1, lastReviewAskMs: Date.now() });
      }
      asking.current = false;
    })();
  }, [busy, elderMode]);

  const action = updateAction(info, {
    nowMs: now,
    dismissedVersion: prompts.dismissedVersion,
    dismissedAtMs: prompts.dismissedAtMs,
    busy,
    meshRunning,
  });
  if (!onboarded || action.kind === 'none') return null;

  const later = () => prompts.set({ dismissedVersion: info.versionCode, dismissedAtMs: Date.now() });
  const title = action.kind === 'restart' ? t('update.readyTitle') : t('update.title');
  const body =
    action.kind === 'restart'
      ? t(action.stopsMesh ? 'update.readyBodyMesh' : 'update.readyBody')
      : action.kind === 'downloading'
        ? t('update.downloading')
        : t(action.urgent ? 'update.urgentBody' : 'update.body');

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + space.sm, left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg }}>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{
          width: '100%',
          maxWidth: 560,
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: action.kind === 'offer' && action.urgent ? theme.colors.warning : theme.colors.border,
          borderWidth: 1,
          borderRadius: radius.card,
          padding: space.md,
          gap: space.sm,
        }}>
        <Text variant="body" weight="bold">
          {title}
        </Text>
        <Text variant="bodySmall" tone="muted">
          {body}
        </Text>
        {action.kind === 'downloading' ? null : (
          <Row style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" label={t('update.later')} onPress={later} />
            {action.kind === 'restart' ? (
              <Button icon="refresh" label={t('update.restart')} onPress={() => void PlayStore.completeUpdate().catch(() => undefined)} />
            ) : (
              <Button icon="download" label={t('update.update')} onPress={() => void PlayStore.startUpdate().then((ok) => (ok ? undefined : later()))} />
            )}
          </Row>
        )}
      </View>
    </View>
  );
}
