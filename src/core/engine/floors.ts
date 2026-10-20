// Floor estimate (C3): barometric altitude relative to you ("2 floors above you").

/** Typical floor-to-floor height in malls and stadium tiers; tunable from field tests. */
export const FLOOR_HEIGHT_M = 3.5;
/** Ignore differences smaller than this (sensor noise). */
export const DEADBAND_M = 1.6;
/** Pressure from more than 5 minutes ago is not compared (weather drift). */
export const MAX_AGE_MS = 5 * 60_000;

/** Hypsometric approximation: metres above the level where pressure equals [referencePa]. */
export function altitudeDiffM(pressurePa: number, referencePa: number): number {
  return 44330 * (1 - Math.pow(pressurePa / referencePa, 1 / 5.255));
}

export interface FloorEstimate {
  floors: number;
  key: 'floors.same' | 'floors.above' | 'floors.below';
}

export function floorsRelative(
  theirPa: number | null | undefined,
  theirAtMs: number,
  myPa: number | null | undefined,
  nowMs: number,
  floorHeight = FLOOR_HEIGHT_M,
): FloorEstimate | null {
  if (!theirPa || !myPa || nowMs - theirAtMs > MAX_AGE_MS) return null;
  const dh = altitudeDiffM(theirPa, myPa);
  if (Math.abs(dh) < DEADBAND_M) return { floors: 0, key: 'floors.same' };
  const floors = Math.max(1, Math.round(Math.abs(dh) / floorHeight));
  return { floors, key: dh > 0 ? 'floors.above' : 'floors.below' };
}
