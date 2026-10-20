import { useMemo } from 'react';

import type { GroupDetail, Member } from 'mesh-engine';
import { activeGroup, useMesh } from '@/state/mesh';
import { useSettings } from '@/state/settings';
import type { RadarMember, RadarPin } from './RadarCanvas';
import { useNow } from '@/ui/useNow';

export function toRadarMember(m: Member, sos: Set<string>): RadarMember {
  return {
    id: m.id,
    name: m.name,
    colour: m.colour,
    avatarPreset: m.avatarPreset,
    avatarPhoto: m.avatarPhoto,
    position: m.position ? { lat: m.position.lat, lon: m.position.lon } : null,
    lastMs: Math.max(m.lastHeardMs, m.position?.fixTimeMs ?? 0),
    accuracyM: m.position?.accuracyM ?? 0,
    sos: sos.has(m.id) || !!m.position?.sos,
  };
}

/** Everything the radar tab needs for the active group. */
export function useRadarData(): {
  group: GroupDetail | null;
  members: RadarMember[];
  pins: RadarPin[];
  crumbs: RadarPin[];
} {
  const groups = useMesh((s) => s.groups);
  const details = useMesh((s) => s.details);
  const crumbs = useMesh((s) => s.crumbs);
  const sos = useMesh((s) => s.sos.incoming);
  const preferred = useSettings((s) => s.activeGroupId);
  const now = useNow(60_000);
  return useMemo(() => {
    const g = activeGroup(groups, preferred);
    const detail = g ? details[g.id] ?? null : null;
    if (!detail) return { group: null, members: [], pins: [], crumbs: [] };
    const sosIds = new Set(sos.filter((s) => s.groupId === detail.id).map((s) => s.memberId));
    return {
      group: detail,
      members: detail.members.filter((m) => !m.isSelf).map((m) => toRadarMember(m, sosIds)),
      pins: detail.pins.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon })),
      crumbs: crumbs
        .filter((c) => c.groupId === detail.id && c.expiresAtMs > now)
        .map((c) => ({ id: `crumb-${c.memberId}`, name: c.member?.name ?? '', lat: c.position.lat, lon: c.position.lon })),
    };
  }, [groups, details, crumbs, sos, preferred, now]);
}
