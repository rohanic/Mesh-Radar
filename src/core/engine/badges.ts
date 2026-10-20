// Badges (G3) and streaks (G9). Badges reward relaying and practice; streaks count only positive
// safety habits (a weekly check-in with family), never time spent in the app (principle 7).

export interface BadgeStats {
  relayedForOthers: number;
  relayedByEvent: Record<string, number>;
  regroups: number;
  drillsCompleted: number;
  readinessScore: number;
  eventsAttended: number;
}

export interface Badge {
  id: string;
  key: string;
  /** Count for the label, e.g. "You relayed 1,000 messages for strangers at Kumbh". */
  count?: number;
  eventId?: string;
}

export const RELAY_TIERS = [100, 1_000, 10_000] as const;

export function earnedBadges(s: BadgeStats): Badge[] {
  const out: Badge[] = [];
  for (const t of RELAY_TIERS) {
    if (s.relayedForOthers >= t) out.push({ id: `relay_${t}`, key: 'badge.relayHero', count: t });
  }
  for (const [eventId, n] of Object.entries(s.relayedByEvent)) {
    const tier = [...RELAY_TIERS].reverse().find((t) => n >= t);
    if (tier) out.push({ id: `relay_${eventId}_${tier}`, key: 'badge.relayEvent', count: tier, eventId });
  }
  if (s.regroups >= 1) out.push({ id: 'first_regroup', key: 'badge.firstRegroup' });
  if (s.regroups >= 10) out.push({ id: 'regroup_10', key: 'badge.regroup10', count: 10 });
  if (s.drillsCompleted >= 1) out.push({ id: 'first_drill', key: 'badge.firstDrill' });
  if (s.drillsCompleted >= 5) out.push({ id: 'drill_5', key: 'badge.drill5', count: 5 });
  if (s.readinessScore >= 100) out.push({ id: 'safety_ready', key: 'badge.safetyReady' });
  if (s.eventsAttended >= 3) out.push({ id: 'events_3', key: 'badge.events3', count: 3 });
  return out;
}

/** ISO week key (yyyy-Www) in UTC. */
export function isoWeek(ms: number): string {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7;
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 3));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((thursday.getTime() - yearStart.getTime()) / 86_400_000 - 3 + ((yearStart.getUTCDay() + 6) % 7)) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Weekly family check-in streak (G9): consecutive ISO weeks, ending this week or last week, with at
 * least one check-in. A missed week resets it; there is no penalty beyond that.
 */
export function weeklyStreak(checkinsMs: number[], nowMs: number): number {
  const weeks = new Set(checkinsMs.map(isoWeek));
  const WEEK = 7 * 86_400_000;
  let cursor = nowMs;
  if (!weeks.has(isoWeek(cursor))) cursor -= WEEK;
  let streak = 0;
  while (weeks.has(isoWeek(cursor))) {
    streak++;
    cursor -= WEEK;
  }
  return streak;
}
