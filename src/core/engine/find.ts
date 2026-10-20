// Find mode (C4, flow 2): arrow, distance and haptic pulses that speed up as you get closer.

import { LatLon, distanceM } from './geo';

/** Under 10 m the phone vibrates continuously and both phones chime (flow 2, step 4). */
export const ARRIVED_M = 10;
/** Unreachable this long: suggest the nearest meeting point instead of pushing through (flow 2, step 5). */
export const SUGGEST_PIN_AFTER_MS = 15 * 60_000;

/** Milliseconds between haptic pulses; 0 means continuous. 2 s far away, 250 ms at 10 m. */
export function pulseIntervalMs(distance: number): number {
  if (distance <= ARRIVED_M) return 0;
  return Math.round(Math.min(2000, Math.max(250, 250 + (distance - ARRIVED_M) * 12)));
}

export function isArrived(distance: number): boolean {
  return distance <= ARRIVED_M;
}

export function shouldSuggestMeetingPoint(lastHeardMs: number, nowMs: number): boolean {
  return lastHeardMs > 0 && nowMs - lastHeardMs >= SUGGEST_PIN_AFTER_MS;
}

export interface PinLike extends LatLon {
  id: string;
  name: string;
}

export function nearestPin<T extends PinLike>(own: LatLon, pins: T[]): { pin: T; distanceM: number } | null {
  let best: { pin: T; distanceM: number } | null = null;
  for (const pin of pins) {
    const d = distanceM(own, pin);
    if (!best || d < best.distanceM) best = { pin, distanceM: d };
  }
  return best;
}

/**
 * A "successful regroup" (north-star metric, section 12): a Find session that ends with the two
 * phones within 10 m. Counted once per session on the device.
 */
export function regroupSucceeded(samples: number[]): boolean {
  return samples.some((d) => d <= ARRIVED_M);
}
