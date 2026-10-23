import { NativeModule, requireOptionalNativeModule } from 'expo';

import { createFakeEngine } from './FakeEngine';
import type {
  Breadcrumb,
  ChatKind,
  CheckpointDef,
  CrowdAlert,
  CrowdKind,
  Crumb,
  DrillKind,
  EngineState,
  Entitlements,
  EventPost,
  GroupDetail,
  GroupSummary,
  Health,
  LicenceInfo,
  MeshEngineEvents,
  Message,
  OwnSos,
  Pin,
  PowerMode,
  Profile,
  ResolveReason,
  Role,
  SosKind,
  SosState,
} from './MeshEngine.types';

/** Every function the native engine exposes (MeshEngineModule.kt). */
export interface MeshEngineApi {
  configure(licencePublicKey: string, apiBaseUrl: string, appVersion: number): Promise<void>;
  setStrings(json: string): Promise<void>;
  identity(): Promise<{ memberId: string; signPk: string }>;
  state(): Promise<EngineState>;
  requiredPermissions(): Promise<string[]>;
  start(): Promise<void>;
  stop(): Promise<void>;
  setPowerMode(mode: PowerMode): Promise<void>;
  setRelay(on: boolean): Promise<void>;
  setEventDay(on: boolean, eventId: string): Promise<void>;
  setActiveEvent(eventId: string): Promise<void>;
  setHeadingActive(on: boolean): Promise<void>;
  health(): Promise<Health>;
  openSettings(kind: 'bluetooth' | 'wifi' | 'location' | 'dnd' | 'fullscreen' | 'notifications' | 'app'): Promise<void>;
  wipe(): Promise<void>;

  setProfile(profile: Profile): Promise<void>;
  profile(): Promise<Profile>;
  setLockScreenCard(on: boolean): Promise<void>;

  createGroup(opts: { name: string; eventId: string; expiresAtMs: number; colour: number }): Promise<GroupSummary>;
  invitePayload(groupId: string): Promise<string>;
  joinByInvite(payload: string): Promise<GroupSummary>;
  openJoinWindow(groupId: string): Promise<string>;
  closeJoinWindow(groupId: string): Promise<void>;
  requestJoinByCode(code: string): Promise<string>;
  cancelJoin(requestId: string): Promise<void>;
  answerJoin(requestId: string, accept: boolean): Promise<void>;
  leaveGroup(groupId: string): Promise<void>;
  setArchived(groupId: string, archived: boolean): Promise<void>;
  setGroupColour(groupId: string, colour: number): Promise<void>;
  setRole(groupId: string, memberId: string, role: Exclude<Role, 'leader'>): Promise<void>;
  transferLeader(groupId: string, memberId: string): Promise<void>;
  removeMember(groupId: string, memberId: string): Promise<void>;
  updateGroup(groupId: string, opts: { name?: string; separationM?: number; expiresAtMs?: number }): Promise<void>;
  groups(): Promise<GroupSummary[]>;
  groupDetail(groupId: string): Promise<GroupDetail>;

  sendChat(opts: {
    groupId: string;
    recipientId?: string | null;
    kind: ChatKind;
    text: string;
    quickCode: number;
    lat?: number | null;
    lon?: number | null;
    refId?: string | null;
  }): Promise<Message>;
  sendThumbnail(opts: {
    groupId: string;
    recipientId?: string | null;
    caption: string;
    image: string;
    imageId?: string;
    photoUri?: string;
    fullSize?: number;
  }): Promise<Message>;
  requestPhoto(groupId: string, photoId: string): Promise<void>;
  localPhoto(photoId: string): Promise<string | null>;
  sendMoment(opts: { groupId: string; note: string; lat?: number | null; lon?: number | null; thumbnail: string }): Promise<Message>;
  markRead(groupId: string, msgIds: string[]): Promise<void>;
  messages(groupId: string, peerId: string | null, beforeMs: number, limit: number): Promise<Message[]>;
  moments(groupId: string): Promise<Message[]>;
  quickReplyAll(code: number): Promise<void>;

  setPin(opts: { groupId: string; pinId?: string; name: string; lat: number; lon: number; floor: number; icon: number }): Promise<Pin>;
  deletePin(groupId: string, pinId: string): Promise<void>;

  startSos(kind: SosKind, silent: boolean): Promise<OwnSos>;
  resolveSos(sosId: string, reason: ResolveReason): Promise<void>;
  sosState(): Promise<SosState>;
  crumbs(): Promise<Crumb[]>;
  batteryLevel(): Promise<number>;
  setCheckinTimer(groupId: string, deadlineMs: number): Promise<void>;
  cancelCheckinTimer(groupId: string): Promise<void>;
  checkIn(groupId: string, checkpoint: number): Promise<void>;
  setCheckinPlan(groupId: string, checkpoints: CheckpointDef[], deadlineMs: number): Promise<void>;
  breadcrumbs(groupId: string, memberId: string, sinceMs: number): Promise<Breadcrumb[]>;
  lostChildPayload(groupId: string, memberId: string): Promise<string>;
  reportFoundChild(payload: string, note: string): Promise<string>;
  setLockWallpaper(uri: string): Promise<boolean>;

  postEvent(eventId: string, text: string): Promise<EventPost>;
  eventPosts(eventId: string): Promise<EventPost[]>;
  reportPost(msgId: string): Promise<void>;
  reportCrowd(opts: { eventId: string; kind: CrowdKind; label: string; lat: number; lon: number; organiserCert?: string }): Promise<string>;
  crowdAlerts(eventId: string): Promise<CrowdAlert[]>;
  eventPublicKey(eventId: string): Promise<string>;
  /** Ed25519 signature (base64) of a UTF-8 message with the per-event pseudonymous key. */
  signForEvent(eventId: string, message: string): Promise<string>;
  sharePack(groupId: string, packId: string, json: string): Promise<void>;

  importLicence(token: string): Promise<LicenceInfo>;
  restoreLicences(tokens: string[]): Promise<void>;
  entitlements(groupId: string | null): Promise<Entitlements>;
  /** Ed25519 check of a server file (event pack) against the licence public key. */
  verifySignature(message: string, signatureB64: string): Promise<boolean>;

  sendDrill(opts: { groupId: string; kind: DrillKind; drillId?: string; hiderId: string; durationSec: number }): Promise<string>;
  setFamilyCircle(groupId: string, on: boolean): Promise<void>;
  familyCircleGroups(): Promise<string[]>;

  uwbSupported(): Promise<boolean>;
  startUwb(groupId: string, memberId: string): Promise<void>;
  stopUwb(): Promise<void>;
}

export type EventListener<K extends keyof MeshEngineEvents> = MeshEngineEvents[K];

export interface MeshEngineEmitter {
  addListener<K extends keyof MeshEngineEvents>(event: K, listener: MeshEngineEvents[K]): { remove(): void };
}

declare class NativeMeshEngine extends NativeModule<MeshEngineEvents> {}

const native = requireOptionalNativeModule<NativeMeshEngine & MeshEngineApi>('MeshEngine');

/** True when running in a development build with the engine linked (not in Jest or Expo Go). */
export const isNativeEngine = native != null;

/**
 * The engine. In tests and Expo Go there is no native module, so an in-memory fake with the same
 * API stands in (single phone, no radio), which keeps the UI testable.
 */
export const MeshEngine: MeshEngineApi & MeshEngineEmitter = (native as (MeshEngineApi & MeshEngineEmitter) | null) ??
  // Development only: sample data for screenshots and design work (EXPO_PUBLIC_DEMO=1).
  createFakeEngine({ demo: process.env.EXPO_PUBLIC_DEMO === '1' });
