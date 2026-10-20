// Blip freshness (C2): "now", "2 min", "lost signal 9 min". Stale blips fade after 2 minutes and turn
// grey after 10 minutes. Principle 4: show real age, never fake precision.

export type FreshnessState = 'live' | 'stale' | 'lost';

export interface Freshness {
  state: FreshnessState;
  /** Whole minutes since the last fix or packet. */
  minutes: number;
  /** 1 for live blips, fading to 0.45 at 10 minutes; grey blips stay at 0.45. */
  opacity: number;
  /** i18n key and count for the label. */
  labelKey: 'freshness.now' | 'freshness.minutes' | 'freshness.lost';
}

export const FADE_AFTER_MS = 2 * 60_000;
export const GREY_AFTER_MS = 10 * 60_000;
export const NOW_MS = 30_000;

export function freshness(lastMs: number, nowMs: number): Freshness {
  const age = Math.max(0, nowMs - lastMs);
  const minutes = Math.floor(age / 60_000);
  if (age < NOW_MS) return { state: 'live', minutes: 0, opacity: 1, labelKey: 'freshness.now' };
  if (age < FADE_AFTER_MS) return { state: 'live', minutes: Math.max(1, minutes), opacity: 1, labelKey: 'freshness.minutes' };
  if (age < GREY_AFTER_MS) {
    const t = (age - FADE_AFTER_MS) / (GREY_AFTER_MS - FADE_AFTER_MS);
    return { state: 'stale', minutes, opacity: 1 - t * 0.55, labelKey: 'freshness.minutes' };
  }
  return { state: 'lost', minutes, opacity: 0.45, labelKey: 'freshness.lost' };
}
