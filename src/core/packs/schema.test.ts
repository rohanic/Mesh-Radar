import { EventPackSchema as EventPack, countdownDays, nextDate, text } from './schema';

const base = {
  id: 'demo',
  version: 1,
  category: 'festival',
  colors: ['#FFFFFF', '#000000'],
  icon: 'flag',
  countries: ['IN'],
  languages: ['en', 'bn'],
  title: { en: 'Demo', bn: 'ডেমো' },
  summary: { en: 'Summary' },
  dates: [{ start: '2026-10-20', end: '2026-10-24', approx: true }],
  meetingPoints: [{ name: { en: 'Gate' }, detail: { en: 'Pick a numbered gate.' } }],
  dos: [{ en: 'Agree a meeting point.' }],
  donts: [{ en: 'Do not push.' }],
  schedule: [],
  phrasebook: [],
  checklist: [{ en: 'Charge phones.' }],
  sources: ['https://example.org'],
  verified: false,
};

describe('event pack schema (F1, F2)', () => {
  it('accepts a valid pack and rejects unknown languages', () => {
    expect(EventPack.safeParse(base).success).toBe(true);
    expect(EventPack.safeParse({ ...base, title: { en: 'x', xx: 'y' } }).success).toBe(false);
    expect(EventPack.safeParse({ ...base, id: 'Bad Id' }).success).toBe(false);
  });

  it('falls back to English', () => {
    expect(text({ en: 'Hello', bn: 'হ্যালো' }, 'bn')).toBe('হ্যালো');
    expect(text({ en: 'Hello' }, 'ur')).toBe('Hello');
  });

  it('counts down to the next date', () => {
    const now = Date.parse('2026-10-19T12:00:00Z');
    expect(countdownDays('2026-10-20', '2026-10-24', now)).toBe(1);
    expect(countdownDays('2026-10-19', '2026-10-24', now)).toBe(0);
    expect(countdownDays('2026-10-01', '2026-10-05', now)).toBe(-1);
    expect(nextDate({ dates: [{ start: '2026-10-01', end: '2026-10-05', approx: false }, { start: '2027-01-01', end: '2027-01-02', approx: false }] }, now)?.start).toBe('2027-01-01');
  });
});
