// In-app updates (DEC-043). Google Play's flexible flow only: the download runs while the person
// keeps using the app, and the restart that installs it waits for the person to tap it, because a
// restart stops the mesh for a few seconds. Never the immediate (blocking) flow: nothing may stand
// between a person and SOS (PRD section 10, rule 1). Offline, Play cannot answer and nothing shows.

export type UpdateAvailability = 'unknown' | 'none' | 'available' | 'inProgress';

export type InstallStatus = 'unknown' | 'pending' | 'downloading' | 'downloaded' | 'installing' | 'installed' | 'failed' | 'canceled';

export interface UpdateInfo {
  availability: UpdateAvailability;
  /** Play's version code for the waiting update (0 when none). */
  versionCode: number;
  /** Days since Play first offered this update to the phone, or null when Play does not know. */
  stalenessDays: number | null;
  /** 0 to 5, set per release through the Play Developer API; 0 when not set. */
  priority: number;
  flexibleAllowed: boolean;
  installStatus: InstallStatus;
}

export interface UpdateContext {
  nowMs: number;
  /** The update the person last tapped "Later" on, and when. */
  dismissedVersion: number;
  dismissedAtMs: number;
  /** A safety moment is on screen or running: SOS, an incoming alert, Find mode or event day. */
  busy: boolean;
  /** The mesh service is running, so a restart would stop it until the person taps Start again. */
  meshRunning: boolean;
}

export type UpdateAction =
  | { kind: 'none' }
  | { kind: 'offer'; versionCode: number; urgent: boolean }
  | { kind: 'downloading' }
  | { kind: 'restart'; stopsMesh: boolean };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** "Later" hides a normal update for this long. */
export const UPDATE_SNOOZE_DAYS = 3;
/** "Later" on a downloaded update hides the restart for this long. */
export const RESTART_SNOOZE_HOURS = 6;
/** Releases marked priority 4 or 5 in Play come back after one day. */
export const URGENT_PRIORITY = 4;
/** An update this old is treated as urgent even without a priority. */
export const URGENT_STALENESS_DAYS = 14;

const NONE: UpdateAction = { kind: 'none' };

export function isUrgent(info: Pick<UpdateInfo, 'priority' | 'stalenessDays'>): boolean {
  return info.priority >= URGENT_PRIORITY || (info.stalenessDays ?? 0) >= URGENT_STALENESS_DAYS;
}

export function updateAction(info: UpdateInfo, ctx: UpdateContext): UpdateAction {
  if (ctx.busy) return NONE;
  const dismissedFor = ctx.dismissedVersion === info.versionCode ? ctx.nowMs - ctx.dismissedAtMs : Infinity;
  if (info.installStatus === 'downloaded') {
    return dismissedFor < RESTART_SNOOZE_HOURS * HOUR_MS ? NONE : { kind: 'restart', stopsMesh: ctx.meshRunning };
  }
  if (info.installStatus === 'pending' || info.installStatus === 'downloading') return { kind: 'downloading' };
  if (info.installStatus === 'installing') return NONE;
  if (info.availability !== 'available' || !info.flexibleAllowed || info.versionCode <= 0) return NONE;
  const urgent = isUrgent(info);
  if (dismissedFor < (urgent ? 1 : UPDATE_SNOOZE_DAYS) * DAY_MS) return NONE;
  return { kind: 'offer', versionCode: info.versionCode, urgent };
}
