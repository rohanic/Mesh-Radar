import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Storage } from 'expo-sqlite/kv-store';

import { enqueue, type AnalyticsEvent, type Props, type QueuedEvent } from '@/core/engine/analytics';
import { useSettings } from '@/state/settings';

// Opt-in crash reports and anonymous analytics (section 8 stack, section 9 commitment 3, DEC-022).
// Both are off by default. Analytics wait in an on-device queue and go to PostHog's batch endpoint
// when online; they never contain location.

interface Extra {
  sentryDsn?: string;
  posthogKey?: string;
  posthogHost?: string;
}
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
const QUEUE_KEY = 'analytics.queue';
const ID_KEY = 'analytics.id';
let sentryStarted = false;

function anonymousId(): string {
  let id = Storage.getItemSync(ID_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    Storage.setItemSync(ID_KEY, id);
  }
  return id;
}

function readQueue(): QueuedEvent[] {
  try {
    return JSON.parse(Storage.getItemSync(QUEUE_KEY) ?? '[]') as QueuedEvent[];
  } catch {
    return [];
  }
}

export function startTelemetry() {
  const s = useSettings.getState();
  if (s.crashOptIn && extra.sentryDsn && !sentryStarted) {
    Sentry.init({ dsn: extra.sentryDsn, sendDefaultPii: false, enableAutoSessionTracking: true, tracesSampleRate: 0 });
    sentryStarted = true;
  }
  void flush();
}

export function track(event: AnalyticsEvent, props: Props = {}) {
  if (!useSettings.getState().analyticsOptIn) return;
  Storage.setItemSync(QUEUE_KEY, JSON.stringify(enqueue(readQueue(), { event, props, atMs: Date.now() })));
}

export async function flush(): Promise<void> {
  if (!useSettings.getState().analyticsOptIn || !extra.posthogKey || !extra.posthogHost) return;
  const queue = readQueue();
  if (!queue.length) return;
  const distinctId = anonymousId();
  try {
    const res = await fetch(`${extra.posthogHost.replace(/\/$/, '')}/batch/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: extra.posthogKey,
        batch: queue.map((e) => ({ event: e.event, properties: { distinct_id: distinctId, ...e.props }, timestamp: new Date(e.atMs).toISOString() })),
      }),
    });
    if (res.ok) Storage.setItemSync(QUEUE_KEY, '[]');
  } catch {
    // Offline: keep the queue for next time.
  }
}

/** Opting out clears everything queued and the anonymous ID. */
export function optOut() {
  Storage.removeItemSync(QUEUE_KEY);
  Storage.removeItemSync(ID_KEY);
}
