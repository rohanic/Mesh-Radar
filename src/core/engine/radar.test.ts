import { destination } from './geo';
import { FADE_AFTER_MS, GREY_AFTER_MS, freshness } from './freshness';
import { autoRange, project } from './radar';

const me = { lat: 22.5726, lon: 88.3639 };
const now = 1_760_000_000_000;

describe('freshness (C2)', () => {
  it('shows now, minutes, fades after 2 min and turns grey after 10 min', () => {
    expect(freshness(now - 5_000, now)).toMatchObject({ state: 'live', labelKey: 'freshness.now', opacity: 1 });
    expect(freshness(now - 90_000, now)).toMatchObject({ state: 'live', minutes: 1, opacity: 1 });
    const mid = freshness(now - (FADE_AFTER_MS + GREY_AFTER_MS) / 2, now);
    expect(mid.state).toBe('stale');
    expect(mid.opacity).toBeLessThan(1);
    expect(mid.opacity).toBeGreaterThan(0.45);
    expect(freshness(now - 9 * 60_000 - 59_000, now).state).toBe('stale');
    expect(freshness(now - GREY_AFTER_MS, now)).toMatchObject({ state: 'lost', minutes: 10, opacity: 0.45, labelKey: 'freshness.lost' });
  });
});

describe('radar projection (C1)', () => {
  it('auto-zooms to the smallest ring that fits', () => {
    expect(autoRange([10])).toBe(25);
    expect(autoRange([30])).toBe(50);
    expect(autoRange([95])).toBe(250);
    expect(autoRange([1000])).toBe(250);
    expect(autoRange([])).toBe(25);
  });

  it('rotates blips by compass heading so ahead is up', () => {
    const north = destination(me, 0, 40);
    const view = project(me, 90, [{ id: 'a', position: north, accuracyM: 5, lastMs: now }], now);
    const b = view.blips[0]!;
    // Facing east, a member due north is to the left.
    expect(b.relative).toBeCloseTo(-90, 0);
    expect(b.x).toBeLessThan(-0.7);
    expect(Math.abs(b.y)).toBeLessThan(0.05);
    expect(view.rangeM).toBe(50);
    expect(view.rotation).toBe(-90);
  });

  it('draws far members on the edge and caps the accuracy halo', () => {
    const far = destination(me, 180, 900);
    const view = project(me, null, [{ id: 'f', position: far, accuracyM: 500, lastMs: now }], now, 100);
    const b = view.blips[0]!;
    expect(b.beyond).toBe(true);
    expect(Math.hypot(b.x, b.y)).toBeCloseTo(1, 5);
    expect(b.y).toBeGreaterThan(0.99);
    expect(b.halo).toBe(0.35);
    expect(view.rings.map((r) => r.metres)).toEqual([25, 50, 100]);
  });

  it('zooms on live members and ignores long-lost ones for the range', () => {
    const near = destination(me, 10, 20);
    const lost = destination(me, 10, 200);
    const view = project(
      me,
      0,
      [
        { id: 'n', position: near, accuracyM: 3, lastMs: now },
        { id: 'l', position: lost, accuracyM: 3, lastMs: now - 20 * 60_000 },
      ],
      now,
    );
    expect(view.rangeM).toBe(25);
    expect(view.blips.find((b) => b.id === 'l')!.beyond).toBe(true);
  });
});
