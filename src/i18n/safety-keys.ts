// Strings that a person in danger reads (section 11: SOS, quick replies, alerts). They are
// professionally translated and native-speaker tested before release; `npm run check:release`
// requires `safetyVerified` in status.json for every language.

export const SAFETY_PREFIXES = [
  'sos.',
  'quick.',
  'crumb.',
  'alerts.',
  'lostChild.',
  'separation.',
  'battery.',
  'find.',
  'numbers.',
  'card.',
  'elder.',
  'checkin.missed',
  'events.crowd',
  'native.',
] as const;

export function isSafetyKey(key: string): boolean {
  return SAFETY_PREFIXES.some((p) => key.startsWith(p));
}
