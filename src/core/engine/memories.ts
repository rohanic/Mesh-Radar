// Trip memories (G1): an auto-made card after each event with route, distance walked, places,
// group photo and members. Built from the engine's breadcrumbs and moments on the device.

import { LatLon, distanceM } from './geo';

export interface TrackPoint extends LatLon {
  atMs: number;
}

/** Ignore GPS jitter: steps under 4 m or implausibly fast (over 4 m/s on foot) are dropped. */
export function walkedMetres(track: TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1]!;
    const b = track[i]!;
    const d = distanceM(a, b);
    const dt = Math.max(1, (b.atMs - a.atMs) / 1000);
    if (d < 4 || d / dt > 4) continue;
    total += d;
  }
  return total;
}

/** Simplify a route for the card (Douglas-Peucker on a local flat projection), tolerance in metres. */
export function simplify(track: TrackPoint[], toleranceM = 8): TrackPoint[] {
  if (track.length < 3) return track;
  const origin = track[0]!;
  const k = Math.cos((origin.lat * Math.PI) / 180);
  const xy = track.map((p) => ({ x: (p.lon - origin.lon) * 111_320 * k, y: (p.lat - origin.lat) * 111_320 }));
  const keep = new Array<boolean>(track.length).fill(false);
  keep[0] = keep[track.length - 1] = true;
  const stack: [number, number][] = [[0, track.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    const a = xy[s]!;
    const b = xy[e]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    for (let i = s + 1; i < e; i++) {
      const p = xy[i]!;
      const d = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0 && maxD > toleranceM) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return track.filter((_, i) => keep[i]);
}

export interface PlaceLike extends LatLon {
  name: string;
}

/** Places (meeting points) the person came within [radiusM] of, in visit order. */
export function placesVisited<T extends PlaceLike>(track: TrackPoint[], places: T[], radiusM = 60): T[] {
  const seen: T[] = [];
  for (const p of track) {
    for (const place of places) {
      if (!seen.includes(place) && distanceM(p, place) <= radiusM) seen.push(place);
    }
  }
  return seen;
}

export interface MemoryInput {
  groupName: string;
  eventId: string;
  startMs: number;
  endMs: number;
  track: TrackPoint[];
  places: PlaceLike[];
  members: { id: string; name: string }[];
  moments: { text: string; image: string | null; createdAtMs: number }[];
}

export interface Memory {
  id: string;
  title: string;
  eventId: string;
  startMs: number;
  endMs: number;
  distanceM: number;
  route: TrackPoint[];
  places: string[];
  members: string[];
  momentCount: number;
  cover: string | null;
}

export function buildMemory(input: MemoryInput): Memory {
  const track = input.track.filter((p) => p.atMs >= input.startMs && p.atMs <= input.endMs);
  return {
    id: `${input.eventId || 'trip'}-${input.startMs}`,
    title: input.groupName,
    eventId: input.eventId,
    startMs: input.startMs,
    endMs: input.endMs,
    distanceM: Math.round(walkedMetres(track)),
    route: simplify(track),
    places: placesVisited(track, input.places).map((p) => p.name),
    members: input.members.map((m) => m.name),
    momentCount: input.moments.length,
    cover: input.moments.find((m) => m.image)?.image ?? null,
  };
}
