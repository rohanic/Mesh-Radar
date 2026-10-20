// List view (C5): for accessibility and groups over 10. Screen readers hear
// "Ammi, 85 metres, ahead right".

import { Freshness, freshness } from './freshness';
import { LatLon, RelativeDirection, bearingDeg, distanceM, relativeBearing, relativeDirection } from './geo';

export interface ListMember {
  id: string;
  name: string;
  position: (LatLon & { fixTimeMs: number }) | null;
  lastHeardMs: number;
}

export interface ListRow<T extends ListMember> {
  member: T;
  distanceM: number | null;
  direction: RelativeDirection | null;
  freshness: Freshness;
}

/** Nearest first; members with no position last, most recently heard first. */
export function listRows<T extends ListMember>(own: LatLon | null, heading: number | null, members: T[], nowMs: number): ListRow<T>[] {
  const rows = members.map((member) => {
    const p = member.position;
    const f = freshness(Math.max(member.lastHeardMs, p?.fixTimeMs ?? 0), nowMs);
    if (!own || !p) return { member, distanceM: null, direction: null, freshness: f };
    const d = distanceM(own, p);
    const rel = relativeBearing(bearingDeg(own, p), heading ?? 0);
    return { member, distanceM: d, direction: relativeDirection(rel), freshness: f };
  });
  return rows.sort((a, b) => {
    if (a.distanceM == null && b.distanceM == null) return b.member.lastHeardMs - a.member.lastHeardMs;
    if (a.distanceM == null) return 1;
    if (b.distanceM == null) return -1;
    return a.distanceM - b.distanceM;
  });
}

/** Large groups switch to the list by default (C5). */
export const LIST_BY_DEFAULT_OVER = 10;
