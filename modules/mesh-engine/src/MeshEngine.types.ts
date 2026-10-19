// JS contract for the native mesh engine. Shapes must match
// modules/mesh-engine/core/src/main/kotlin/com/rohanic/meshradar/core/engine/Maps.kt.
// Times are milliseconds since the epoch; IDs are lowercase hex; images are base64.

export type PowerMode = 'radar' | 'balanced' | 'standby' | 'ultra_saver';
export type Role = 'leader' | 'member' | 'elder' | 'child';
export type Tier = 'free' | 'event_pass' | 'family_plus' | 'organiser';
export type SosKind = 'general' | 'medical' | 'lost' | 'danger';
export type ResolveReason = 'safe' | 'found' | 'false_alarm';
export type ChatKind = 'text' | 'quick' | 'location' | 'system';
export type MessageKind = ChatKind | 'image' | 'moment';
export type MessageState = 'sending' | 'in_mesh' | 'delivered' | 'read' | 'received';
export type Via = 'nearby' | 'ble' | 'internet' | 'self';
export type CrowdKind = 'crush_risk' | 'gate_closed' | 'fire' | 'medical' | 'flood' | 'other';
export type DrillKind = 'start' | 'found' | 'end';
export type Compass8 = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface Position {
  lat: number;
  lon: number;
  altM: number | null;
  pressurePa: number | null;
  accuracyM: number;
  heading: number | null;
  battery: number | null;
  charging: boolean;
  sos: boolean;
  ultraSaver: boolean;
  fixTimeMs: number;
}

export interface EmergencyCard {
  name: string;
  bloodGroup: string;
  conditions: string;
  medicines: string;
  contactName: string;
  contactPhone: string;
  stay: string;
}

export interface Member {
  id: string;
  name: string;
  colour: number;
  avatarPreset: number;
  avatarPhoto: string | null;
  role: Role;
  joinedAtMs: number;
  position: Position | null;
  lastHeardMs: number;
  hops: number;
  via: Via;
  isSelf: boolean;
  signPk: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  eventId: string;
  colour: number;
  archived: boolean;
  createdAtMs: number;
  expiresAtMs: number;
  memberCount: number;
  maxMembers: number;
  isLeader: boolean;
  myRole: Role;
  separationM: number;
  tier: Tier;
}

export interface Pin {
  id: string;
  name: string;
  lat: number;
  lon: number;
  floor: number;
  icon: number;
  updatedMs: number;
}

export interface CheckpointDef {
  name: string;
  lat: number;
  lon: number;
  radiusM: number;
}

export interface CheckinInfo {
  planDeadlineMs: number;
  checkpoints: CheckpointDef[];
  /** memberId -> deadline */
  timers: Record<string, number>;
  /** memberId -> highest checkpoint index reached */
  progress: Record<string, number>;
  lastCheckinMs: Record<string, number>;
}

export interface GroupDetail extends GroupSummary {
  members: Member[];
  pins: Pin[];
  checkin: CheckinInfo;
  mailboxId: string;
}

export interface Message {
  msgId: string;
  groupId: string;
  senderId: string;
  recipientId: string | null;
  outgoing: boolean;
  kind: MessageKind;
  text: string;
  quickCode: number;
  lat: number | null;
  lon: number | null;
  /** Pin ID for chat, image ID for photos, moment ID for moments. */
  refId: string | null;
  image: string | null;
  fullSize: number;
  createdAtMs: number;
  state: MessageState;
  delivered: number;
  read: number;
  hops: number;
}

export interface OwnSos {
  sosId: string;
  kind: SosKind;
  silent: boolean;
  startedAtMs: number;
  broadcasts: number;
}

export interface IncomingSos {
  sosId: string;
  groupId: string;
  memberId: string;
  member: Member | null;
  kind: SosKind;
  silent: boolean;
  position: Position;
  card: EmergencyCard;
  startedAtMs: number;
  lastAtMs: number;
  hops: number;
  resolved: boolean;
  first?: boolean;
}

export interface PublicSos {
  sosId: string;
  kind: SosKind;
  lastAtMs: number;
  active: boolean;
  direction: Compass8 | null;
  bearing?: number;
  withinM: number | null;
}

export interface SosState {
  own: OwnSos | null;
  incoming: IncomingSos[];
  publicNearby: PublicSos[];
}

export interface Crumb {
  groupId: string;
  memberId: string;
  member: Member | null;
  reason: 'battery_15' | 'battery_5' | 'battery_2' | 'shutdown' | 'manual';
  position: Position;
  receivedAtMs: number;
  expiresAtMs: number;
}

export interface Health {
  neighbours: number;
  maxHops: number;
  lastPacketMs: number;
  lastSyncMs: number;
  stored: number;
  seen: number;
  relayEnabled: boolean;
  powerMode: PowerMode;
  eventDay: boolean;
  activeEventId: string;
  relayedForOthers: number;
  relayedByEvent: Record<string, number>;
  messagesSent: number;
  sosSent: number;
}

export interface Radios {
  bluetooth: boolean;
  wifi: boolean;
  location: boolean;
  bleExtended: boolean;
  playServices: boolean;
  uwb: boolean;
  barometer: boolean;
  compass: boolean;
  sdk: number;
  manufacturer: string;
  permissions: Record<string, boolean>;
}

export interface EngineState {
  running: boolean;
  powerMode: PowerMode;
  radios: Radios;
  bleBeacons: boolean;
  nearby: boolean;
  lockScreenCard: boolean;
  dndAccess: boolean;
}

export interface EventPost {
  msgId: string;
  eventId: string;
  sender: string;
  text: string;
  atMs: number;
  mine: boolean;
}

export interface CrowdAlert {
  clusterId: string;
  kind: CrowdKind;
  label: string;
  lat: number;
  lon: number;
  reports: number;
  verified: boolean;
  organiser: string;
  firstAtMs: number;
  lastAtMs: number;
  eventId?: string;
}

export interface Entitlements {
  tier: Tier;
  maxMembers: number;
  maxActiveGroups: number;
  allPacks: boolean;
  breadcrumbs: boolean;
  separationAlerts: boolean;
  memories: boolean;
  familyCircle: boolean;
  organiser: boolean;
  groupTier: Tier;
  myTier: Tier;
}

export interface LicenceInfo {
  id: string;
  tier: Tier;
  expiresAtMs: number;
  issuedAtMs: number;
}

export interface Profile {
  name: string;
  colour: number;
  avatarPreset: number;
  avatarPhoto?: string | null;
  card: EmergencyCard;
}

export interface Breadcrumb {
  atMs: number;
  lat: number;
  lon: number;
}

// A type alias (not an interface) so it satisfies Expo's EventsMap index signature.
export type MeshEngineEvents = {
  engineState: (e: EngineState) => void;
  health: (e: Health) => void;
  groups: (e: { groups: GroupSummary[] }) => void;
  group: (e: GroupDetail) => void;
  position: (e: { groupId: string; member: Member }) => void;
  ownPosition: (e: Position) => void;
  heading: (e: { heading: number; accuracy: number }) => void;
  pressure: (e: { pressurePa: number }) => void;
  battery: (e: { level: number; charging: boolean }) => void;
  message: (e: Message) => void;
  messageState: (e: { msgId: string; groupId: string; state: MessageState; delivered: number; read: number }) => void;
  pins: (e: { groupId: string; pins: Pin[] }) => void;
  sos: (e: IncomingSos) => void;
  sosResolved: (e: { sosId: string; by: string; own: boolean }) => void;
  publicSos: (e: PublicSos) => void;
  publicSosEnded: (e: { sosId: string }) => void;
  crumb: (e: Crumb) => void;
  lowBattery: (e: { level: number }) => void;
  checkin: (e: { groupId: string; checkin: CheckinInfo }) => void;
  checkedIn: (e: { groupId: string; checkpoint: number; name: string; auto: boolean }) => void;
  checkinMissed: (e: { groupId: string; memberId: string; kind: 'timer' | 'plan'; deadlineMs: number; member: Member | null; self: boolean }) => void;
  separation: (e: { groupId: string; member: Member; distanceM: number; bearing: number; thresholdM: number }) => void;
  separationCleared: (e: { groupId: string; memberId: string }) => void;
  lostChildFound: (e: { groupId: string; alertId: string; childName: string; note: string; position: Position | null; finder: string; hops: number; atMs: number }) => void;
  joinRequest: (e: { requestId: string; groupId: string; name: string; colour: number; avatarPreset: number; memberId: string }) => void;
  joinResult: (e: { requestId: string; ok: boolean; reason?: string; group?: GroupSummary }) => void;
  memberJoined: (e: { groupId: string; member: Member }) => void;
  groupFull: (e: { groupId: string; name: string }) => void;
  groupArchived: (e: { groupId: string; name: string }) => void;
  removedFromGroup: (e: { groupId: string; name: string }) => void;
  licence: (e: { groupId: string; tier: Tier }) => void;
  eventPost: (e: EventPost) => void;
  crowdAlert: (e: CrowdAlert) => void;
  drill: (e: { groupId: string; senderId: string; kind: DrillKind; drillId: string; hiderId: string; durationSec: number; startedAtMs: number }) => void;
  uwb: (e: Record<string, unknown>) => void;
  uwbRange: (e: { memberId: string; distanceM: number | null; azimuth: number | null; elevation: number | null }) => void;
  uwbState: (e: { state: 'ranging' | 'lost' | 'stopped' | 'error'; memberId?: string; reason?: string }) => void;
  pack: (e: { groupId: string; from: string; fromName: string; packId: string; json: string }) => void;
  photoReceived: (e: { photoId: string; groupId: string; uri: string }) => void;
  photoRequest: (e: Record<string, unknown>) => void;
  photoMeta: (e: Record<string, unknown>) => void;
};

export type MeshEventName = keyof MeshEngineEvents;
