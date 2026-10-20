// Opt-in, anonymous analytics (section 9 privacy commitment 3; section 12). Events never contain
// location, names, messages or group IDs: only the allow-listed properties below survive.

export type AnalyticsEvent =
  | 'onboarding_step'
  | 'onboarding_done'
  | 'group_created'
  | 'group_joined'
  | 'regroup_success'
  | 'find_started'
  | 'sos_sent'
  | 'drill_done'
  | 'pack_downloaded'
  | 'power_mode'
  | 'purchase'
  | 'relay_session';

const ALLOWED_PROPS = new Set(['step', 'method', 'mode', 'tier', 'packId', 'language', 'count', 'durationSec', 'hops', 'result']);
const FORBIDDEN = /lat|lon|location|position|name|text|group|member|phone|email|card/i;

export type Props = Record<string, string | number | boolean>;

export function sanitize(props: Props): Props {
  const out: Props = {};
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOWED_PROPS.has(k) || FORBIDDEN.test(k)) continue;
    if (typeof v === 'string' && v.length > 40) continue;
    out[k] = v;
  }
  return out;
}

export interface QueuedEvent {
  event: AnalyticsEvent;
  props: Props;
  atMs: number;
}

/** Offline queue: keeps the newest [max] events; sent in one batch when online. */
export function enqueue(queue: QueuedEvent[], e: QueuedEvent, max = 500): QueuedEvent[] {
  const next = [...queue, { ...e, props: sanitize(e.props) }];
  return next.length > max ? next.slice(next.length - max) : next;
}
