// Event community wire format (G7, DEC-036), shared by the app and the Worker. Posts and reports
// are signed with the per-event pseudonymous Ed25519 key, so the Worker can rate limit and count
// reports per key without knowing who anyone is.

export const COMMUNITY = {
  textChars: 280,
  cityChars: 60,
  postsPerHour: 5,
  reportsToHide: 3,
  /** Signed timestamps older or newer than this are rejected (replay protection). */
  maxSkewSec: 300,
} as const;

const LINK = /(https?:\/\/|www\.|\.(com|net|org|io|me|ly|pk|in|sa|ae)\b)/i;

export interface PostInput {
  eventId: string;
  pk: string;
  city: string;
  text: string;
  ts: number;
}

export interface ReportInput {
  eventId: string;
  pk: string;
  postId: string;
  ts: number;
}

export function postSigningMessage(p: PostInput): string {
  return ['mr-community-post-v1', p.eventId, p.pk, p.city, p.text, String(p.ts)].join('\n');
}

export function reportSigningMessage(r: ReportInput): string {
  return ['mr-community-report-v1', r.eventId, r.pk, r.postId, String(r.ts)].join('\n');
}

/** Null when the post is acceptable, otherwise the reason. */
export function postProblem(text: string, city: string): 'empty' | 'too_long' | 'link' | null {
  const t = text.trim();
  if (!t) return 'empty';
  if ([...t].length > COMMUNITY.textChars || [...city].length > COMMUNITY.cityChars) return 'too_long';
  if (LINK.test(t) || LINK.test(city)) return 'link';
  return null;
}

export function freshTimestamp(ts: number, nowSec: number): boolean {
  return Number.isInteger(ts) && Math.abs(nowSec - ts) <= COMMUNITY.maxSkewSec;
}
