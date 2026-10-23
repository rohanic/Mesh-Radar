import { analyticsCases } from './testkit';
import { enqueue, sanitize } from './analytics';
import { earnedBadges, isoWeek, weeklyStreak } from './badges';
import { DRILL_SECONDS, nextHider, phase, results, secondsLeft, seekerFound } from './drill';
import { gregorianToJd, islamicToJd, jdToGregorian, jdToIslamic, toHijri } from './hijri';
import { buildMemory, placesVisited, simplify, walkedMetres } from './memories';
import { destination } from './geo';
import { hoursLeft, shouldOfferUltraSaver } from './power';
import { QUICK_REPLIES, quickReply } from './quickReplies';
import { cardFilled, readiness } from './safetyScore';
import { ALWAYS_FREE, canDownloadPack, canUse, organiserPriceUsd } from './tiers';

const now = Date.UTC(2026, 9, 19, 12);
const free = { maxMembers: 6, maxActiveGroups: 1, allPacks: false, breadcrumbs: false, separationAlerts: false, memories: false, familyCircle: false, organiser: false };
const pass = { ...free, maxMembers: 25, allPacks: true, breadcrumbs: true, separationAlerts: true, memories: true };

describe('tiers (section 10)', () => {
  it('never gates safety features', () => {
    for (const f of ALWAYS_FREE) expect(canUse(f, free)).toBe(true);
  });

  it('gates bigger groups, memories and packs beyond three', () => {
    expect(canUse('big_group', free)).toBe(false);
    expect(canUse('big_group', pass)).toBe(true);
    expect(canUse('memories', free)).toBe(false);
    expect(canUse('multiple_groups', { ...pass, maxActiveGroups: 5 })).toBe(true);
    expect(canDownloadPack(['a', 'b'], 'c', free)).toBe(true);
    expect(canDownloadPack(['a', 'b', 'c'], 'd', free)).toBe(false);
    expect(canDownloadPack(['a', 'b', 'c'], 'a', free)).toBe(true);
    expect(canDownloadPack(['a', 'b', 'c'], 'd', pass)).toBe(true);
  });

  it('prices organiser rosters at 0.20 per member with a 10 dollar minimum', () => {
    expect(organiserPriceUsd(20)).toBe(10);
    expect(organiserPriceUsd(500)).toBe(100);
  });
});

describe('safety ready score (G5)', () => {
  it('weights the emergency card highest and lists what is missing', () => {
    const r = readiness({ hasName: true, hasAvatar: false, cardFilled: false, inGroup: true, packDownloaded: false, drillDone: false, permissionsGranted: true, tutorialDone: false });
    expect(r.score).toBe(35);
    expect(r.missing[0]).toBe('cardFilled');
    expect(readiness({ hasName: true, hasAvatar: true, cardFilled: true, inGroup: true, packDownloaded: true, drillDone: true, permissionsGranted: true, tutorialDone: true }).score).toBe(100);
  });

  it('needs a contact and one medical detail for a filled card', () => {
    expect(cardFilled({ bloodGroup: 'B+', conditions: '', medicines: '', contactPhone: '+92 300' })).toBe(true);
    expect(cardFilled({ bloodGroup: 'B+', conditions: '', medicines: '', contactPhone: ' ' })).toBe(false);
  });
});

describe('badges and streaks (G3, G9)', () => {
  it('awards Relay Hero tiers overall and per event', () => {
    const b = earnedBadges({ relayedForOthers: 1_200, relayedByEvent: { 'kumbh-magh-mela': 1_050, psl: 20 }, regroups: 1, drillsCompleted: 0, readinessScore: 100, eventsAttended: 0 });
    const ids = b.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(['relay_100', 'relay_1000', 'relay_kumbh-magh-mela_1000', 'first_regroup', 'safety_ready']));
    expect(ids).not.toContain('relay_10000');
    expect(ids.some((i) => i.includes('psl'))).toBe(false);
  });

  it('counts consecutive weeks with a family check-in', () => {
    const week = 7 * 86_400_000;
    expect(weeklyStreak([now, now - week, now - 2 * week], now)).toBe(3);
    expect(weeklyStreak([now - week, now - 2 * week], now)).toBe(2);
    expect(weeklyStreak([now, now - 2 * week], now)).toBe(1);
    expect(weeklyStreak([], now)).toBe(0);
    expect(isoWeek(Date.UTC(2026, 0, 1))).toBe('2026-W01');
    expect(isoWeek(Date.UTC(2027, 0, 1))).toBe('2026-W53');
  });
});

describe('trip memories (G1)', () => {
  const start = { lat: 35.3, lon: 74.6 };
  const track = Array.from({ length: 30 }, (_, i) => ({ ...destination(start, 90, i * 50), atMs: now + i * 60_000 }));

  it('measures distance walked and ignores jitter and jumps', () => {
    expect(walkedMetres(track)).toBeCloseTo(29 * 50, -1);
    const jitter = [track[0]!, { ...destination(start, 0, 2), atMs: now + 1000 }, { ...destination(start, 0, 3), atMs: now + 2000 }];
    expect(walkedMetres(jitter)).toBe(0);
    const jump = [track[0]!, { ...destination(start, 0, 900), atMs: now + 10_000 }];
    expect(walkedMetres(jump)).toBe(0);
  });

  it('simplifies a straight route to its ends and finds visited places', () => {
    expect(simplify(track).length).toBe(2);
    const camp = { name: 'Camp 1', ...destination(start, 90, 500) };
    const elsewhere = { name: 'Far', ...destination(start, 0, 5_000) };
    expect(placesVisited(track, [camp, elsewhere]).map((p) => p.name)).toEqual(['Camp 1']);
    const m = buildMemory({ groupName: 'Fairy Meadows', eventId: 'trekking', startMs: now, endMs: now + 3_600_000, track, places: [camp], members: [{ id: '1', name: 'Karim' }], moments: [{ text: 'view', image: 'abc', createdAtMs: now }] });
    expect(m.places).toEqual(['Camp 1']);
    expect(m.cover).toBe('abc');
    expect(m.members).toEqual(['Karim']);
  });
});

describe('regroup drill (G4)', () => {
  const s = { drillId: 'd', hiderId: 'h', startedAtMs: now, durationSec: DRILL_SECONDS, found: { a: 200_000, b: 90_000 }, ended: false };
  it('moves through hiding, seeking and done', () => {
    expect(phase(null, now)).toBe('idle');
    expect(phase(s, now + 30_000)).toBe('hiding');
    expect(phase(s, now + 120_000)).toBe('seeking');
    expect(phase(s, now + DRILL_SECONDS * 1000)).toBe('done');
    expect(secondsLeft(s, now + 100_000)).toBe(200);
    expect(seekerFound(9)).toBe(true);
    expect(results(s).map((r) => r.memberId)).toEqual(['b', 'a']);
    expect(nextHider(['a', 'b', 'c'], { a: 3, b: 1 })).toBe('c');
  });
});

describe('Hijri calendar (section 11)', () => {
  it('round trips between Gregorian and Hijri day numbers', () => {
    expect(islamicToJd(1, 1, 1)).toBe(1948439.5);
    for (const [y, m, d] of [
      [2024, 7, 7],
      [2026, 2, 18],
      [2026, 10, 19],
    ] as const) {
      const jd = gregorianToJd(y, m, d);
      expect(jdToGregorian(jd)).toEqual({ y, m, d });
      const h = jdToIslamic(jd);
      expect(islamicToJd(h.y, h.m, h.d)).toBe(jd);
    }
  });

  it('places October 2026 in the year 1448', () => {
    const h = toHijri(now);
    expect(h.y).toBe(1448);
    expect(h.m).toBeGreaterThanOrEqual(4);
    expect(h.m).toBeLessThanOrEqual(5);
  });
});

describe('power and quick replies', () => {
  it('offers Ultra-saver at 15 percent unless charging (E4)', () => {
    expect(shouldOfferUltraSaver(15, false, 'balanced')).toBe(true);
    expect(shouldOfferUltraSaver(15, true, 'balanced')).toBe(false);
    expect(shouldOfferUltraSaver(16, false, 'balanced')).toBe(false);
    expect(shouldOfferUltraSaver(10, false, 'ultra_saver')).toBe(false);
    expect(hoursLeft(15, 'ultra_saver')).toBe(15);
    expect(hoursLeft(60, 'radar')).toBe(10);
  });

  it('keeps the six PRD quick replies plus low battery, with stable codes', () => {
    expect(QUICK_REPLIES.map((q) => q.code)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(quickReply(4)!.needsPin).toBe(true);
    expect(quickReply(99)).toBeUndefined();
  });
});

describe('analytics privacy (section 9)', () => {
  it.each(analyticsCases)('drops %s', (key) => {
    expect(sanitize({ [key]: 1 })).toEqual({});
  });

  it('keeps allowed fields and caps the queue', () => {
    expect(sanitize({ step: 'language', count: 2 })).toEqual({ step: 'language', count: 2 });
    let q: ReturnType<typeof enqueue> = [];
    for (let i = 0; i < 510; i++) q = enqueue(q, { event: 'find_started', props: { lat: 1, count: i }, atMs: i });
    expect(q.length).toBe(500);
    expect(q[0]!.props).toEqual({ count: 10 });
  });
});

describe('feature matrix', () => {
  it('maps every paid feature to its flag', () => {
    const all = { maxMembers: 500, maxActiveGroups: 5, allPacks: true, breadcrumbs: true, separationAlerts: true, memories: true, familyCircle: true, organiser: true };
    for (const f of ['big_group', 'all_packs', 'breadcrumbs', 'memories', 'family_circle', 'multiple_groups', 'organiser_tools'] as const) {
      expect(canUse(f, all)).toBe(true);
      expect(canUse(f, free)).toBe(false);
    }
  });

  it('never gates a safety feature, separation alerts included (rule 1, DEC-027)', () => {
    for (const f of ALWAYS_FREE) expect(canUse(f, free)).toBe(true);
    expect(ALWAYS_FREE).toContain('separation_alerts');
  });

  it('awards regroup, drill and event badges at their thresholds', () => {
    const ids = earnedBadges({ relayedForOthers: 0, relayedByEvent: {}, regroups: 10, drillsCompleted: 5, readinessScore: 40, eventsAttended: 3 }).map((b) => b.id);
    expect(ids).toEqual(['first_regroup', 'regroup_10', 'first_drill', 'drill_5', 'events_3']);
  });

  it('drops long strings from analytics', () => {
    expect(sanitize({ step: 'x'.repeat(41) })).toEqual({});
  });
});
