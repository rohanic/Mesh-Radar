// In-app review (DEC-044). Google Play's own rating dialog, asked only right after something went
// well and never near a safety moment. Play policy forbids asking "do you like the app?" or
// offering anything before the dialog, so the app shows the dialog directly. Play also caps how
// often its dialog appears; these limits sit well under that cap.

export type ReviewMoment = 'regroup' | 'drillDone';

export interface ReviewStats {
  firstOpenMs: number;
  /** Distinct local days the app was opened. */
  activeDays: number;
  regroups: number;
  drillsCompleted: number;
  /** Last time this phone sent or received an SOS, or 0. */
  lastSosMs: number;
  asks: number;
  lastAskMs: number;
}

export interface ReviewContext {
  nowMs: number;
  /** A safety moment is on screen or running: SOS, an incoming alert, Find mode or event day. */
  busy: boolean;
  /** Elder mode keeps the three big buttons and nothing else (H3). */
  elderMode: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const REVIEW_MIN_INSTALL_DAYS = 3;
export const REVIEW_MIN_ACTIVE_DAYS = 3;
export const REVIEW_GAP_DAYS = 120;
export const REVIEW_MAX_ASKS = 3;
/** Nobody is asked for a rating within a week of an SOS. */
export const REVIEW_SOS_QUIET_DAYS = 7;

export function shouldAskForReview(stats: ReviewStats, moment: ReviewMoment, ctx: ReviewContext): boolean {
  if (ctx.busy || ctx.elderMode) return false;
  if (stats.asks >= REVIEW_MAX_ASKS) return false;
  if (stats.lastAskMs > 0 && ctx.nowMs - stats.lastAskMs < REVIEW_GAP_DAYS * DAY_MS) return false;
  if (stats.lastSosMs > 0 && ctx.nowMs - stats.lastSosMs < REVIEW_SOS_QUIET_DAYS * DAY_MS) return false;
  if (stats.firstOpenMs <= 0 || ctx.nowMs - stats.firstOpenMs < REVIEW_MIN_INSTALL_DAYS * DAY_MS) return false;
  if (stats.activeDays < REVIEW_MIN_ACTIVE_DAYS) return false;
  // The moment must be a real success, not the first try of a feature.
  return moment === 'regroup' ? stats.regroups >= 1 : stats.drillsCompleted >= 1;
}

/** A local calendar day key, so opens are counted once per day in the person's time zone. */
export function dayKey(ms: number, tzOffsetMin: number): number {
  return Math.floor((ms - tzOffsetMin * 60 * 1000) / DAY_MS);
}
