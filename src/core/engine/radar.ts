// Radar projection (C1, C2): blips by direction and distance, rotated by compass heading, with
// auto-zoom across rings at 25/50/100/250 m and an accuracy halo from GPS accuracy.

import { Freshness, freshness } from './freshness';
import { LatLon, bearingDeg, distanceM, relativeBearing } from './geo';

export const RINGS_M = [25, 50, 100, 250] as const;

export interface RadarTarget {
  id: string;
  position: LatLon;
  accuracyM: number;
  lastMs: number;
}

export interface Blip {
  id: string;
  /** Unit coordinates: radar radius is 1, x to the right, y down (screen). */
  x: number;
  y: number;
  distanceM: number;
  bearing: number;
  /** Relative to the phone's heading (or north when there is no compass). */
  relative: number;
  /** Farther than the outer ring: drawn on the edge with its distance. */
  beyond: boolean;
  /** Accuracy halo radius in unit coordinates, capped so it never swallows the radar. */
  halo: number;
  freshness: Freshness;
}

export interface RadarView {
  rangeM: number;
  /** Ring radii in unit coordinates for the current range. */
  rings: { metres: number; r: number }[];
  /** Rotation applied to the rose: -heading, or 0 when north-up. */
  rotation: number;
  blips: Blip[];
}

/** Smallest ring that holds every live target with 10 percent margin; 250 m at most. */
export function autoRange(distances: number[]): number {
  const far = distances.length ? Math.max(...distances) * 1.1 : 0;
  return RINGS_M.find((r) => r >= far) ?? RINGS_M[RINGS_M.length - 1]!;
}

export function project(own: LatLon, heading: number | null, targets: RadarTarget[], nowMs: number, fixedRange?: number): RadarView {
  const measured = targets.map((t) => ({ t, d: distanceM(own, t.position), b: bearingDeg(own, t.position), f: freshness(t.lastMs, nowMs) }));
  const live = measured.filter((m) => m.f.state !== 'lost').map((m) => m.d);
  const rangeM = fixedRange ?? autoRange(live.length ? live : measured.map((m) => m.d));
  const up = heading ?? 0;
  const blips = measured.map(({ t, d, b, f }) => {
    const rel = relativeBearing(b, up);
    const beyond = d > rangeM;
    const r = beyond ? 1 : d / rangeM;
    const rad = (rel * Math.PI) / 180;
    return {
      id: t.id,
      x: Math.sin(rad) * r,
      y: -Math.cos(rad) * r,
      distanceM: d,
      bearing: b,
      relative: rel,
      beyond,
      halo: Math.min(0.35, Math.max(0, t.accuracyM) / rangeM),
      freshness: f,
    };
  });
  const rings = RINGS_M.filter((m) => m <= rangeM).map((m) => ({ metres: m, r: m / rangeM }));
  return { rangeM, rings, rotation: -up, blips };
}
