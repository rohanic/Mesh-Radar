import type { MeshEngineApi, MeshEngineEmitter } from './MeshEngineModule';
import type {
  CrowdAlert,
  EmergencyCard,
  EngineState,
  EventPost,
  GroupDetail,
  GroupSummary,
  Health,
  MeshEngineEvents,
  Member,
  Message,
  OwnSos,
  Pin,
  PowerMode,
  Profile,
  Tier,
} from './MeshEngine.types';

const emptyCard: EmergencyCard = { name: '', bloodGroup: '', conditions: '', medicines: '', contactName: '', contactPhone: '', stay: '' };

const TIERS: Record<Tier, { maxMembers: number; maxActiveGroups: number; paid: boolean; familyCircle: boolean; organiser: boolean }> = {
  free: { maxMembers: 6, maxActiveGroups: 1, paid: false, familyCircle: false, organiser: false },
  event_pass: { maxMembers: 25, maxActiveGroups: 1, paid: true, familyCircle: false, organiser: false },
  family_plus: { maxMembers: 25, maxActiveGroups: 5, paid: true, familyCircle: true, organiser: false },
  organiser: { maxMembers: 500, maxActiveGroups: 5, paid: true, familyCircle: false, organiser: true },
};

function hex(n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

/**
 * In-memory stand-in for the native engine: one phone, no radio. Used by Jest and by Expo Go,
 * where native modules are unavailable. It keeps the same contract so screens behave the same.
 */
export function createFakeEngine(): MeshEngineApi & MeshEngineEmitter {
  type AnyListener = (e: never) => void;
  const listeners = new Map<string, Set<AnyListener>>();
  const emit = <K extends keyof MeshEngineEvents>(name: K, payload: Parameters<MeshEngineEvents[K]>[0]) => {
    listeners.get(name)?.forEach((l) => (l as (e: typeof payload) => void)(payload));
  };
  const myId = hex(16);
  let profile: Profile = { name: '', colour: 0, avatarPreset: 0, card: emptyCard };
  let powerMode: PowerMode = 'balanced';
  let running = false;
  let relay = true;
  let eventDay = false;
  let activeEventId = '';
  let lockScreenCard = false;
  const groups = new Map<string, GroupDetail>();
  const messages: Message[] = [];
  const posts: EventPost[] = [];
  let ownSos: OwnSos | null = null;

  const self = (role: Member['role']): Member => ({
    id: myId,
    name: profile.name,
    colour: profile.colour,
    avatarPreset: profile.avatarPreset,
    avatarPhoto: profile.avatarPhoto ?? null,
    role,
    joinedAtMs: Date.now(),
    position: null,
    lastHeardMs: Date.now(),
    hops: 0,
    via: 'self',
    isSelf: true,
    signPk: hex(64),
  });

  const summary = (g: GroupDetail): GroupSummary => {
    const { members, pins, checkin, mailboxId, ...rest } = g;
    void pins;
    void checkin;
    void mailboxId;
    return { ...rest, memberCount: members.length };
  };

  const health = (): Health => ({
    neighbours: 0,
    maxHops: 0,
    lastPacketMs: 0,
    lastSyncMs: 0,
    stored: 0,
    seen: 0,
    relayEnabled: relay && powerMode !== 'ultra_saver',
    powerMode,
    eventDay,
    activeEventId,
    relayedForOthers: 0,
    relayedByEvent: {},
    messagesSent: messages.filter((m) => m.outgoing).length,
    sosSent: 0,
  });

  const state = (): EngineState => ({
    running,
    powerMode,
    radios: {
      bluetooth: true,
      wifi: true,
      location: true,
      bleExtended: false,
      playServices: false,
      uwb: false,
      barometer: false,
      compass: false,
      sdk: 0,
      manufacturer: 'fake',
      permissions: {},
    },
    bleBeacons: false,
    nearby: false,
    lockScreenCard,
    dndAccess: false,
  });

  const group = (id: string): GroupDetail => {
    const g = groups.get(id);
    if (!g) throw Object.assign(new Error('no_group'), { code: 'no_group' });
    return g;
  };

  const message = (groupId: string, partial: Partial<Message>): Message => {
    const m: Message = {
      msgId: hex(32),
      groupId,
      senderId: myId,
      recipientId: null,
      outgoing: true,
      kind: 'text',
      text: '',
      quickCode: 0,
      lat: null,
      lon: null,
      refId: null,
      image: null,
      fullSize: 0,
      createdAtMs: Date.now(),
      state: 'sending',
      delivered: 0,
      read: 0,
      hops: 0,
      ...partial,
    };
    messages.push(m);
    emit('message', m);
    return m;
  };

  const api: MeshEngineApi & MeshEngineEmitter = {
    addListener(event, listener) {
      const set = listeners.get(event) ?? new Set();
      set.add(listener as AnyListener);
      listeners.set(event, set);
      return { remove: () => set.delete(listener as AnyListener) };
    },
    async configure() {},
    async setStrings() {},
    async identity() {
      return { memberId: myId, signPk: hex(64) };
    },
    async state() {
      return state();
    },
    async requiredPermissions() {
      return [];
    },
    async start() {
      running = true;
      emit('engineState', state());
    },
    async stop() {
      running = false;
      emit('engineState', state());
    },
    async setPowerMode(mode) {
      powerMode = mode;
      emit('health', health());
    },
    async setRelay(on) {
      relay = on;
    },
    async setEventDay(on, eventId) {
      eventDay = on;
      if (on) activeEventId = eventId;
    },
    async setActiveEvent(eventId) {
      activeEventId = eventId;
    },
    async setHeadingActive() {},
    async health() {
      return health();
    },
    async openSettings() {},
    async wipe() {
      groups.clear();
      messages.length = 0;
      profile = { name: '', colour: 0, avatarPreset: 0, card: emptyCard };
    },
    async setProfile(p) {
      profile = { ...p };
    },
    async profile() {
      return profile;
    },
    async setLockScreenCard(on) {
      lockScreenCard = on;
    },
    async createGroup(opts) {
      const id = hex(32);
      const g: GroupDetail = {
        id,
        name: opts.name,
        eventId: opts.eventId,
        colour: opts.colour,
        archived: false,
        createdAtMs: Date.now(),
        expiresAtMs: opts.expiresAtMs,
        memberCount: 1,
        maxMembers: TIERS.free.maxMembers,
        isLeader: true,
        myRole: 'leader',
        separationM: 150,
        tier: 'free',
        members: [self('leader')],
        pins: [],
        checkin: { planDeadlineMs: 0, checkpoints: [], timers: {}, progress: {}, lastCheckinMs: {} },
        mailboxId: hex(32),
      };
      groups.set(id, g);
      emit('groups', { groups: [...groups.values()].map(summary) });
      return summary(g);
    },
    async invitePayload(groupId) {
      return 'meshradar://join/' + group(groupId).id;
    },
    async joinByInvite() {
      throw Object.assign(new Error('bad_invite'), { code: 'bad_invite' });
    },
    async openJoinWindow() {
      return String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
    },
    async closeJoinWindow() {},
    async requestJoinByCode() {
      return hex(32);
    },
    async cancelJoin() {},
    async answerJoin() {},
    async leaveGroup(groupId) {
      groups.delete(groupId);
      emit('groups', { groups: [...groups.values()].map(summary) });
    },
    async setArchived(groupId, archived) {
      group(groupId).archived = archived;
    },
    async setGroupColour(groupId, colour) {
      group(groupId).colour = colour;
    },
    async setRole(groupId, memberId, role) {
      const m = group(groupId).members.find((x) => x.id === memberId);
      if (m) m.role = role;
    },
    async transferLeader() {},
    async removeMember(groupId, memberId) {
      const g = group(groupId);
      g.members = g.members.filter((m) => m.id !== memberId);
    },
    async updateGroup(groupId, opts) {
      const g = group(groupId);
      if (opts.name) g.name = opts.name;
      if (opts.separationM) g.separationM = opts.separationM;
      if (opts.expiresAtMs !== undefined) g.expiresAtMs = opts.expiresAtMs;
    },
    async groups() {
      return [...groups.values()].map(summary);
    },
    async groupDetail(groupId) {
      const g = group(groupId);
      return { ...g, memberCount: g.members.length };
    },
    async sendChat(opts) {
      return message(opts.groupId, {
        recipientId: opts.recipientId ?? null,
        kind: opts.kind,
        text: opts.text,
        quickCode: opts.quickCode,
        lat: opts.lat ?? null,
        lon: opts.lon ?? null,
        refId: opts.refId ?? null,
      });
    },
    async sendThumbnail(opts) {
      return message(opts.groupId, { kind: 'image', text: opts.caption, image: opts.image, refId: opts.imageId ?? hex(32), fullSize: opts.fullSize ?? 0 });
    },
    async requestPhoto() {},
    async localPhoto() {
      return null;
    },
    async sendMoment(opts) {
      return message(opts.groupId, { kind: 'moment', text: opts.note, lat: opts.lat ?? null, lon: opts.lon ?? null, image: opts.thumbnail || null });
    },
    async markRead() {},
    async messages(groupId, peerId, beforeMs, limit) {
      return messages
        .filter((m) => m.groupId === groupId && m.createdAtMs < beforeMs && (peerId ? m.recipientId === peerId || m.senderId === peerId : m.recipientId === null))
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
        .slice(0, limit);
    },
    async moments(groupId) {
      return messages.filter((m) => m.groupId === groupId && m.kind === 'moment');
    },
    async quickReplyAll() {},
    async setPin(opts) {
      const g = group(opts.groupId);
      const pin: Pin = { id: opts.pinId ?? hex(32), name: opts.name, lat: opts.lat, lon: opts.lon, floor: opts.floor, icon: opts.icon, updatedMs: Date.now() };
      g.pins = [...g.pins.filter((p) => p.id !== pin.id), pin];
      emit('pins', { groupId: g.id, pins: g.pins });
      return pin;
    },
    async deletePin(groupId, pinId) {
      const g = group(groupId);
      g.pins = g.pins.filter((p) => p.id !== pinId);
      emit('pins', { groupId, pins: g.pins });
    },
    async startSos(kind, silent) {
      ownSos = ownSos ?? { sosId: hex(32), kind, silent, startedAtMs: Date.now(), broadcasts: 1 };
      return ownSos;
    },
    async resolveSos(sosId) {
      if (ownSos?.sosId === sosId) ownSos = null;
      emit('sosResolved', { sosId, by: myId, own: true });
    },
    async sosState() {
      return { own: ownSos, incoming: [], publicNearby: [] };
    },
    async crumbs() {
      return [];
    },
    async batteryLevel() {
      return 100;
    },
    async setCheckinTimer(groupId, deadlineMs) {
      group(groupId).checkin.timers[myId] = deadlineMs;
    },
    async cancelCheckinTimer(groupId) {
      delete group(groupId).checkin.timers[myId];
    },
    async checkIn(groupId, checkpoint) {
      const c = group(groupId).checkin;
      c.lastCheckinMs[myId] = Date.now();
      delete c.timers[myId];
      if (checkpoint >= 0) c.progress[myId] = Math.max(c.progress[myId] ?? -1, checkpoint);
    },
    async setCheckinPlan(groupId, checkpoints, deadlineMs) {
      const c = group(groupId).checkin;
      c.checkpoints = checkpoints;
      c.planDeadlineMs = deadlineMs;
    },
    async breadcrumbs() {
      return [];
    },
    async lostChildPayload(groupId, memberId) {
      return `meshradar://found/${groupId}.${memberId}`;
    },
    async reportFoundChild() {
      return hex(32);
    },
    async setLockWallpaper() {
      return false;
    },
    async postEvent(eventId, text) {
      const post: EventPost = { msgId: hex(32), eventId, sender: hex(8), text, atMs: Date.now(), mine: true };
      posts.push(post);
      return post;
    },
    async eventPosts(eventId) {
      return posts.filter((p) => p.eventId === eventId);
    },
    async reportPost() {},
    async reportCrowd() {
      return hex(32);
    },
    async crowdAlerts(): Promise<CrowdAlert[]> {
      return [];
    },
    async eventPublicKey() {
      return hex(64);
    },
    async sharePack() {},
    async importLicence() {
      throw Object.assign(new Error('bad_licence'), { code: 'bad_licence' });
    },
    async restoreLicences() {},
    async entitlements() {
      const t = TIERS.free;
      return {
        tier: 'free',
        maxMembers: t.maxMembers,
        maxActiveGroups: t.maxActiveGroups,
        allPacks: t.paid,
        breadcrumbs: t.paid,
        separationAlerts: t.paid,
        memories: t.paid,
        familyCircle: t.familyCircle,
        organiser: t.organiser,
        groupTier: 'free',
        myTier: 'free',
      };
    },
    async verifySignature() {
      return false;
    },
    async sendDrill() {
      return hex(32);
    },
    async setFamilyCircle() {},
    async familyCircleGroups() {
      return [];
    },
    async uwbSupported() {
      return false;
    },
    async startUwb() {
      throw Object.assign(new Error('uwb_unsupported'), { code: 'uwb_unsupported' });
    },
    async stopUwb() {},
  };
  return api;
}
