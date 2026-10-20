// Geodesy for the radar (C1), Find mode (C4) and list view (C5). Pure functions.

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance in metres (haversine). */
export function distanceM(a: LatLon, b: LatLon): number {
  const dp = toRad(b.lat - a.lat);
  const dl = toRad(b.lon - a.lon);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Initial bearing from a to b, degrees clockwise from true north, 0 to 360. */
export function bearingDeg(a: LatLon, b: LatLon): number {
  const p1 = toRad(a.lat);
  const p2 = toRad(b.lat);
  const dl = toRad(b.lon - a.lon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return normalise(toDeg(Math.atan2(y, x)));
}

export function normalise(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Bearing relative to where the phone points: 0 is straight ahead, 90 is right. Range -180..180. */
export function relativeBearing(bearing: number, heading: number): number {
  let d = normalise(bearing - heading);
  if (d > 180) d -= 360;
  return d;
}

/** Point at a distance and bearing from a start point (used by tests and pin placement). */
export function destination(from: LatLon, bearing: number, metres: number): LatLon {
  const d = metres / EARTH_RADIUS_M;
  const t = toRad(bearing);
  const p1 = toRad(from.lat);
  const l1 = toRad(from.lon);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
  const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { lat: toDeg(p2), lon: ((toDeg(l2) + 540) % 360) - 180 };
}

export type Compass8 = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
const COMPASS: Compass8[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function compass8(bearing: number): Compass8 {
  return COMPASS[Math.round(normalise(bearing) / 45) % 8]!;
}

/** Eight relative directions for speech and the list view (C5: "ahead right"). */
export type RelativeDirection = 'ahead' | 'ahead_right' | 'right' | 'behind_right' | 'behind' | 'behind_left' | 'left' | 'ahead_left';
const RELATIVE: RelativeDirection[] = ['ahead', 'ahead_right', 'right', 'behind_right', 'behind', 'behind_left', 'left', 'ahead_left'];

export function relativeDirection(relative: number): RelativeDirection {
  return RELATIVE[Math.round(normalise(relative) / 45) % 8]!;
}
