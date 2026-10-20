import { bearingDeg, compass8, destination, distanceM, normalise, relativeBearing, relativeDirection } from './geo';
import { distanceParts, formatDistance, toNumerals } from './units';

const kaaba = { lat: 21.4225, lon: 39.8262 };

describe('geo', () => {
  it('measures distance and bearing consistently with destination()', () => {
    for (const [b, d] of [
      [0, 85],
      [90, 240],
      [225, 1500],
      [359, 10],
    ] as const) {
      const p = destination(kaaba, b, d);
      expect(distanceM(kaaba, p)).toBeCloseTo(d, 0);
      expect(Math.abs(relativeBearing(bearingDeg(kaaba, p), b))).toBeLessThan(0.5);
    }
  });

  it('keeps bearing error well under 15 degrees at 20 m (C1)', () => {
    const p = destination(kaaba, 47, 20);
    expect(Math.abs(bearingDeg(kaaba, p) - 47)).toBeLessThan(0.5);
  });

  it('computes relative bearing and eight directions for "ahead right"', () => {
    expect(relativeBearing(100, 60)).toBe(40);
    expect(relativeBearing(10, 350)).toBe(20);
    expect(relativeBearing(350, 10)).toBe(-20);
    expect(relativeDirection(40)).toBe('ahead_right');
    expect(relativeDirection(-90)).toBe('left');
    expect(relativeDirection(180)).toBe('behind');
    expect(relativeDirection(-170)).toBe('behind');
    expect(relativeDirection(0)).toBe('ahead');
  });

  it('names compass points', () => {
    expect(compass8(0)).toBe('N');
    expect(compass8(44)).toBe('NE');
    expect(compass8(200)).toBe('S');
    expect(compass8(-45)).toBe('NW');
    expect(normalise(-90)).toBe(270);
  });
});

describe('units', () => {
  it('rounds honestly in metric', () => {
    expect(distanceParts(8.4, 'metric')).toEqual({ value: 8, unit: 'm' });
    expect(distanceParts(87, 'metric')).toEqual({ value: 85, unit: 'm' });
    expect(distanceParts(2349, 'metric')).toEqual({ value: 2.3, unit: 'km' });
  });

  it('supports feet and miles', () => {
    expect(distanceParts(30, 'imperial')).toEqual({ value: 100, unit: 'ft' });
    expect(distanceParts(3218.7, 'imperial')).toEqual({ value: 2, unit: 'mi' });
  });

  it('writes Eastern Arabic digits on request', () => {
    expect(toNumerals('240 m', 'eastern_arabic')).toBe('٢٤٠ m');
    expect(toNumerals('240 m', 'eastern_arabic', true)).toBe('۲۴۰ m');
    expect(toNumerals('240 m', 'western', true)).toBe('240 m');
    expect(formatDistance(85, 'metric', 'western')).toBe('85 m');
    expect(formatDistance(85, 'metric', 'eastern_arabic')).toBe('٨٥ m');
  });
});
