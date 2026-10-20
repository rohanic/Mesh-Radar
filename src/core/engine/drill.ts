// Regroup Drill (G4): a weekly 5-minute hide-and-seek using the radar. One person hides; the rest
// use Find mode. Practising the real flow, fun and repeatable.

import { ARRIVED_M } from './find';

export const DRILL_SECONDS = 5 * 60;

export type DrillPhase = 'idle' | 'hiding' | 'seeking' | 'done';

export interface DrillState {
  drillId: string;
  hiderId: string;
  startedAtMs: number;
  durationSec: number;
  /** memberId -> found time (ms since start). */
  found: Record<string, number>;
  ended: boolean;
}

/** The hider gets the first minute to hide. */
export const HIDE_SECONDS = 60;

export function phase(s: DrillState | null, nowMs: number): DrillPhase {
  if (!s) return 'idle';
  if (s.ended) return 'done';
  const t = (nowMs - s.startedAtMs) / 1000;
  if (t < HIDE_SECONDS) return 'hiding';
  if (t < s.durationSec) return 'seeking';
  return 'done';
}

export function secondsLeft(s: DrillState, nowMs: number): number {
  return Math.max(0, Math.ceil(s.durationSec - (nowMs - s.startedAtMs) / 1000));
}

/** A seeker finds the hider when within 10 m, as in a real regroup. */
export function seekerFound(distanceM: number): boolean {
  return distanceM <= ARRIVED_M;
}

export function results(s: DrillState): { memberId: string; seconds: number }[] {
  return Object.entries(s.found)
    .map(([memberId, ms]) => ({ memberId, seconds: Math.round(ms / 1000) }))
    .sort((a, b) => a.seconds - b.seconds);
}

/** Pick the next hider: whoever hid least recently, so everyone gets a turn. */
export function nextHider(memberIds: string[], lastHid: Record<string, number>): string | null {
  if (!memberIds.length) return null;
  return [...memberIds].sort((a, b) => (lastHid[a] ?? 0) - (lastHid[b] ?? 0))[0]!;
}
