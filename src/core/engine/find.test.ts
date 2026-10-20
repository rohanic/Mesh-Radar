import { destination } from './geo';
import { ARRIVED_M, isArrived, nearestPin, pulseIntervalMs, regroupSucceeded, shouldSuggestMeetingPoint } from './find';
import { altitudeDiffM, floorsRelative } from './floors';
import { listRows } from './list';

const me = { lat: 25.4358, lon: 81.8463 };
const now = 1_760_000_000_000;

describe('find mode (C4, flow 2)', () => {
  it('pulses faster as distance falls and goes continuous under 10 m', () => {
    expect(pulseIntervalMs(500)).toBe(2000);
    expect(pulseIntervalMs(100)).toBeLessThan(pulseIntervalMs(150));
    expect(pulseIntervalMs(11)).toBe(262);
    expect(pulseIntervalMs(ARRIVED_M)).toBe(0);
    expect(isArrived(9.9)).toBe(true);
  });

  it('suggests the nearest meeting point after 15 minutes unreachable', () => {
    expect(shouldSuggestMeetingPoint(now - 14 * 60_000, now)).toBe(false);
    expect(shouldSuggestMeetingPoint(now - 15 * 60_000, now)).toBe(true);
    expect(shouldSuggestMeetingPoint(0, now)).toBe(false);
    const gate = { id: 'g', name: 'Gate 7', ...destination(me, 0, 300) };
    const tent = { id: 't', name: 'Tent 42', ...destination(me, 90, 120) };
    expect(nearestPin(me, [gate, tent])!.pin.name).toBe('Tent 42');
    expect(nearestPin(me, [])).toBeNull();
  });

  it('counts a regroup when the phones came within 10 m', () => {
    expect(regroupSucceeded([80, 40, 12])).toBe(false);
    expect(regroupSucceeded([80, 9])).toBe(true);
  });
});

describe('floors (C3)', () => {
  it('turns pressure differences into floors', () => {
    // About 12 Pa per metre near sea level.
    expect(altitudeDiffM(101_325 - 84, 101_325)).toBeCloseTo(7, 0);
    expect(floorsRelative(101_325 - 84, now, 101_325, now)).toEqual({ floors: 2, key: 'floors.above' });
    expect(floorsRelative(101_325 + 42, now, 101_325, now)).toEqual({ floors: 1, key: 'floors.below' });
    expect(floorsRelative(101_320, now, 101_325, now)).toEqual({ floors: 0, key: 'floors.same' });
  });

  it('refuses to compare missing or stale readings', () => {
    expect(floorsRelative(null, now, 101_325, now)).toBeNull();
    expect(floorsRelative(101_000, now - 6 * 60_000, 101_325, now)).toBeNull();
  });
});

describe('list view (C5)', () => {
  it('sorts nearest first with direction words for screen readers', () => {
    const ammi = { id: 'a', name: 'Ammi', lastHeardMs: now, position: { ...destination(me, 45, 85), fixTimeMs: now } };
    const sara = { id: 's', name: 'Sara', lastHeardMs: now, position: { ...destination(me, 180, 30), fixTimeMs: now } };
    const lost = { id: 'l', name: 'Lost', lastHeardMs: now - 60_000, position: null };
    const rows = listRows(me, 0, [ammi, lost, sara], now);
    expect(rows.map((r) => r.member.name)).toEqual(['Sara', 'Ammi', 'Lost']);
    expect(rows[1]!.direction).toBe('ahead_right');
    expect(Math.round(rows[1]!.distanceM!)).toBe(85);
    expect(rows[0]!.direction).toBe('behind');
    expect(rows[2]!.distanceM).toBeNull();
  });
});
