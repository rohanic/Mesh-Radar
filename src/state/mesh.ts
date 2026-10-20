import { create } from 'zustand';

import { newMessageHaptic, playChime } from '@/features/sound/sound';
import {
  MeshEngine,
  type CrowdAlert,
  type Crumb,
  type EngineState,
  type Entitlements,
  type EventPost,
  type GroupDetail,
  type GroupSummary,
  type Health,
  type IncomingSos,
  type Member,
  type Message,
  type Position,
  type PublicSos,
  type SosState,
} from 'mesh-engine';

export type Alert =
  | { id: string; kind: 'sos'; sos: IncomingSos }
  | { id: string; kind: 'publicSos'; sos: PublicSos }
  | { id: string; kind: 'crumb'; crumb: Crumb }
  | { id: string; kind: 'lostChild'; groupId: string; childName: string; note: string; position: Position | null; atMs: number }
  | { id: string; kind: 'checkinMissed'; groupId: string; member: Member | null; memberId: string; self: boolean; deadlineMs: number }
  | { id: string; kind: 'separation'; groupId: string; member: Member; distanceM: number; thresholdM: number }
  | { id: string; kind: 'crowd'; alert: CrowdAlert }
  | { id: string; kind: 'lowBattery'; level: number }
  | { id: string; kind: 'groupFull'; groupId: string; name: string }
  | { id: string; kind: 'removed'; groupId: string; name: string };

export interface JoinRequest {
  requestId: string;
  groupId: string;
  name: string;
  colour: number;
  avatarPreset: number;
}

export interface DrillLive {
  drillId: string;
  hiderId: string;
  startedAtMs: number;
  durationSec: number;
  found: Record<string, number>;
  ended: boolean;
}

export interface UwbLive {
  state: 'ranging' | 'lost' | 'stopped' | 'error';
  memberId?: string;
  distanceM?: number | null;
  azimuth?: number | null;
}

export interface MeshState {
  ready: boolean;
  myId: string;
  engine: EngineState | null;
  health: Health | null;
  groups: GroupSummary[];
  details: Record<string, GroupDetail>;
  own: Position | null;
  heading: number | null;
  headingAccuracy: number;
  pressurePa: number | null;
  battery: { level: number; charging: boolean } | null;
  sos: SosState;
  crumbs: Crumb[];
  alerts: Alert[];
  joinRequests: JoinRequest[];
  joinResults: Record<string, { ok: boolean; reason?: string; groupId?: string }>;
  messages: Record<string, Message[]>;
  unread: Record<string, number>;
  posts: Record<string, EventPost[]>;
  crowd: Record<string, CrowdAlert[]>;
  drills: Record<string, DrillLive>;
  uwb: UwbLive | null;
  entitlements: Record<string, Entitlements>;
  photos: Record<string, string>;
  /** Chat screen currently open (no unread count, no notification). */
  openChat: string | null;
  dismissAlert: (id: string) => void;
  setOpenChat: (groupId: string | null) => void;
}

const emptySos: SosState = { own: null, incoming: [], publicNearby: [] };

export const useMesh = create<MeshState>()((set) => ({
  ready: false,
  myId: '',
  engine: null,
  health: null,
  groups: [],
  details: {},
  own: null,
  heading: null,
  headingAccuracy: 0,
  pressurePa: null,
  battery: null,
  sos: emptySos,
  crumbs: [],
  alerts: [],
  joinRequests: [],
  joinResults: {},
  messages: {},
  unread: {},
  posts: {},
  crowd: {},
  drills: {},
  uwb: null,
  entitlements: {},
  photos: {},
  openChat: null,
  dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
  setOpenChat: (groupId) =>
    set((s) => ({ openChat: groupId, unread: groupId ? { ...s.unread, [groupId]: 0 } : s.unread })),
}));

const push = (alert: Alert) =>
  useMesh.setState((s) => ({ alerts: [...s.alerts.filter((a) => a.id !== alert.id), alert] }));

function mergeMember(detail: GroupDetail | undefined, member: Member): GroupDetail | undefined {
  if (!detail) return detail;
  const members = detail.members.some((m) => m.id === member.id)
    ? detail.members.map((m) => (m.id === member.id ? member : m))
    : [...detail.members, member];
  return { ...detail, members, memberCount: members.length };
}

function upsertMessage(list: Message[] | undefined, m: Message): Message[] {
  const cur = list ?? [];
  if (cur.some((x) => x.msgId === m.msgId)) return cur.map((x) => (x.msgId === m.msgId ? m : x));
  return [...cur, m].sort((a, b) => a.createdAtMs - b.createdAtMs);
}

let started = false;

/** Wire native engine events into the store. Safe to call more than once. */
export function startMeshBridge() {
  if (started) return;
  started = true;
  const e = MeshEngine;
  e.addListener('engineState', (engine) => useMesh.setState({ engine }));
  e.addListener('health', (health) => useMesh.setState({ health }));
  e.addListener('groups', ({ groups }) => {
    useMesh.setState({ groups });
    void refreshEntitlements();
  });
  e.addListener('group', (detail) =>
    useMesh.setState((s) => ({
      details: { ...s.details, [detail.id]: detail },
      groups: s.groups.map((g) => (g.id === detail.id ? { ...g, ...stripDetail(detail) } : g)),
    })),
  );
  e.addListener('position', ({ groupId, member }) =>
    useMesh.setState((s) => {
      const d = mergeMember(s.details[groupId], member);
      return d ? { details: { ...s.details, [groupId]: d } } : {};
    }),
  );
  e.addListener('memberJoined', ({ groupId, member }) =>
    useMesh.setState((s) => {
      const d = mergeMember(s.details[groupId], member);
      return d ? { details: { ...s.details, [groupId]: d } } : {};
    }),
  );
  e.addListener('ownPosition', (own) => useMesh.setState({ own }));
  e.addListener('heading', ({ heading, accuracy }) => useMesh.setState({ heading, headingAccuracy: accuracy }));
  e.addListener('pressure', ({ pressurePa }) => useMesh.setState({ pressurePa }));
  e.addListener('battery', (battery) => useMesh.setState({ battery }));
  e.addListener('message', (m) => {
    if (!m.outgoing && m.kind === 'system' && m.text === 'arrived') void playChime();
    else if (!m.outgoing) newMessageHaptic();
    useMesh.setState((s) => ({
      messages: { ...s.messages, [m.groupId]: upsertMessage(s.messages[m.groupId], m) },
      unread: !m.outgoing && m.kind !== 'system' && s.openChat !== m.groupId ? { ...s.unread, [m.groupId]: (s.unread[m.groupId] ?? 0) + 1 } : s.unread,
    }));
  });
  e.addListener('messageState', ({ msgId, groupId, state, delivered, read }) =>
    useMesh.setState((s) => ({
      messages: {
        ...s.messages,
        [groupId]: (s.messages[groupId] ?? []).map((m) => (m.msgId === msgId ? { ...m, state, delivered, read } : m)),
      },
    })),
  );
  e.addListener('pins', ({ groupId, pins }) =>
    useMesh.setState((s) => (s.details[groupId] ? { details: { ...s.details, [groupId]: { ...s.details[groupId]!, pins } } } : {})),
  );
  e.addListener('checkin', ({ groupId, checkin }) =>
    useMesh.setState((s) => (s.details[groupId] ? { details: { ...s.details, [groupId]: { ...s.details[groupId]!, checkin } } } : {})),
  );
  e.addListener('sos', (sos) => {
    useMesh.setState((s) => ({
      sos: { ...s.sos, incoming: [...s.sos.incoming.filter((x) => x.sosId !== sos.sosId), sos] },
    }));
    if (sos.first) push({ id: `sos:${sos.sosId}`, kind: 'sos', sos });
  });
  e.addListener('sosResolved', ({ sosId, own }) => {
    useMesh.setState((s) => ({
      sos: {
        own: own && s.sos.own?.sosId === sosId ? null : s.sos.own,
        incoming: s.sos.incoming.filter((x) => x.sosId !== sosId),
        publicNearby: s.sos.publicNearby,
      },
      alerts: s.alerts.filter((a) => a.id !== `sos:${sosId}`),
    }));
  });
  e.addListener('publicSos', (p) => {
    useMesh.setState((s) => ({ sos: { ...s.sos, publicNearby: [...s.sos.publicNearby.filter((x) => x.sosId !== p.sosId), p] } }));
    push({ id: `pub:${p.sosId}`, kind: 'publicSos', sos: p });
  });
  e.addListener('publicSosEnded', ({ sosId }) =>
    useMesh.setState((s) => ({
      sos: { ...s.sos, publicNearby: s.sos.publicNearby.filter((x) => x.sosId !== sosId) },
      alerts: s.alerts.filter((a) => a.id !== `pub:${sosId}`),
    })),
  );
  e.addListener('crumb', (crumb) => {
    useMesh.setState((s) => ({ crumbs: [...s.crumbs.filter((c) => !(c.groupId === crumb.groupId && c.memberId === crumb.memberId)), crumb] }));
    push({ id: `crumb:${crumb.groupId}:${crumb.memberId}`, kind: 'crumb', crumb });
  });
  e.addListener('lowBattery', ({ level }) => push({ id: 'lowBattery', kind: 'lowBattery', level }));
  e.addListener('lostChildFound', (p) =>
    push({ id: `lost:${p.alertId}`, kind: 'lostChild', groupId: p.groupId, childName: p.childName, note: p.note, position: p.position, atMs: p.atMs }),
  );
  e.addListener('checkinMissed', (p) =>
    push({ id: `missed:${p.groupId}:${p.memberId}:${p.kind}`, kind: 'checkinMissed', groupId: p.groupId, member: p.member, memberId: p.memberId, self: p.self, deadlineMs: p.deadlineMs }),
  );
  e.addListener('separation', (p) =>
    push({ id: `sep:${p.groupId}:${p.member.id}`, kind: 'separation', groupId: p.groupId, member: p.member, distanceM: p.distanceM, thresholdM: p.thresholdM }),
  );
  e.addListener('separationCleared', ({ groupId, memberId }) => useMesh.getState().dismissAlert(`sep:${groupId}:${memberId}`));
  e.addListener('crowdAlert', (alert) => {
    const ev = alert.eventId ?? '';
    useMesh.setState((s) => ({ crowd: { ...s.crowd, [ev]: [...(s.crowd[ev] ?? []).filter((c) => c.clusterId !== alert.clusterId), alert] } }));
    push({ id: `crowd:${alert.clusterId}`, kind: 'crowd', alert });
  });
  e.addListener('eventPost', (p) =>
    useMesh.setState((s) => ({ posts: { ...s.posts, [p.eventId]: [...(s.posts[p.eventId] ?? []).filter((x) => x.msgId !== p.msgId), p] } })),
  );
  e.addListener('joinRequest', (r) =>
    useMesh.setState((s) => ({ joinRequests: [...s.joinRequests.filter((x) => x.requestId !== r.requestId), r] })),
  );
  e.addListener('joinResult', (r) =>
    useMesh.setState((s) => ({ joinResults: { ...s.joinResults, [r.requestId]: { ok: r.ok, reason: r.reason, groupId: r.group?.id } } })),
  );
  e.addListener('groupFull', (p) => push({ id: `full:${p.groupId}`, kind: 'groupFull', groupId: p.groupId, name: p.name }));
  e.addListener('removedFromGroup', (p) => push({ id: `removed:${p.groupId}`, kind: 'removed', groupId: p.groupId, name: p.name }));
  e.addListener('groupArchived', () => void refreshGroups());
  e.addListener('licence', () => void refreshEntitlements());
  e.addListener('drill', (d) =>
    useMesh.setState((s) => {
      const cur = s.drills[d.groupId];
      if (d.kind === 'start') {
        return { drills: { ...s.drills, [d.groupId]: { drillId: d.drillId, hiderId: d.hiderId, startedAtMs: d.startedAtMs, durationSec: d.durationSec, found: {}, ended: false } } };
      }
      if (!cur || cur.drillId !== d.drillId) return {};
      if (d.kind === 'found') return { drills: { ...s.drills, [d.groupId]: { ...cur, found: { ...cur.found, [d.senderId]: d.startedAtMs - cur.startedAtMs } } } };
      return { drills: { ...s.drills, [d.groupId]: { ...cur, ended: true } } };
    }),
  );
  e.addListener('uwbRange', (r) => useMesh.setState({ uwb: { state: 'ranging', memberId: r.memberId, distanceM: r.distanceM, azimuth: r.azimuth } }));
  e.addListener('uwbState', (st) => useMesh.setState((s) => ({ uwb: { ...(s.uwb ?? {}), state: st.state, memberId: st.memberId ?? s.uwb?.memberId } })));
  e.addListener('photoReceived', ({ photoId, uri }) => useMesh.setState((s) => ({ photos: { ...s.photos, [photoId]: uri } })));
}

function stripDetail(d: GroupDetail): GroupSummary {
  const { members, pins, checkin, mailboxId, ...rest } = d;
  void pins;
  void checkin;
  void mailboxId;
  return { ...rest, memberCount: members.length };
}

export async function refreshGroups() {
  const groups = await MeshEngine.groups();
  const details: Record<string, GroupDetail> = {};
  for (const g of groups) {
    try {
      details[g.id] = await MeshEngine.groupDetail(g.id);
    } catch {
      // group left while loading
    }
  }
  useMesh.setState({ groups, details });
  await refreshEntitlements();
}

export async function refreshEntitlements() {
  const ids = useMesh.getState().groups.map((g) => g.id);
  const out: Record<string, Entitlements> = { me: await MeshEngine.entitlements(null) };
  for (const id of ids) out[id] = await MeshEngine.entitlements(id);
  useMesh.setState({ entitlements: out });
}

export async function refreshAll() {
  const [identity, engine, health, sos, crumbs] = await Promise.all([
    MeshEngine.identity(),
    MeshEngine.state(),
    MeshEngine.health(),
    MeshEngine.sosState(),
    MeshEngine.crumbs(),
  ]);
  useMesh.setState({ myId: identity.memberId, engine, health, sos, crumbs, ready: true });
  await refreshGroups();
}

export async function loadMessages(groupId: string, peerId: string | null) {
  const list = await MeshEngine.messages(groupId, peerId, Date.now() + 60_000, 100);
  useMesh.setState((s) => {
    let merged = s.messages[groupId] ?? [];
    for (const m of list) merged = upsertMessage(merged, m);
    return { messages: { ...s.messages, [groupId]: merged } };
  });
}

/** The group shown on the radar: the chosen one if still active, else the first active group. */
export function activeGroup(groups: GroupSummary[], preferred: string | null): GroupSummary | null {
  const active = groups.filter((g) => !g.archived);
  return active.find((g) => g.id === preferred) ?? active[0] ?? null;
}
