import { COMMUNITY, freshTimestamp, postProblem, postSigningMessage, reportSigningMessage } from './community';

describe('event community format', () => {
  it('signs every field of a post', () => {
    const base = { eventId: 'hajj', pk: 'ab', city: 'Lahore', text: 'Meet after Asr', ts: 1 };
    const msg = postSigningMessage(base);
    expect(msg.split('\n')).toEqual(['mr-community-post-v1', 'hajj', 'ab', 'Lahore', 'Meet after Asr', '1']);
    expect(postSigningMessage({ ...base, city: 'Karachi' })).not.toBe(msg);
    expect(reportSigningMessage({ eventId: 'hajj', pk: 'ab', postId: 'p1', ts: 1 })).toContain('mr-community-report-v1');
  });

  it('rejects empty, long and link posts', () => {
    expect(postProblem('  ', '')).toBe('empty');
    expect(postProblem('a'.repeat(COMMUNITY.textChars + 1), '')).toBe('too_long');
    expect(postProblem('ok', 'c'.repeat(COMMUNITY.cityChars + 1))).toBe('too_long');
    expect(postProblem('join at www.example.com', '')).toBe('link');
    expect(postProblem('see https://x', '')).toBe('link');
    expect(postProblem('Group from Multan meets at the hotel lobby', 'Multan')).toBeNull();
  });

  it('counts characters, not UTF-16 units', () => {
    expect(postProblem('ش'.repeat(COMMUNITY.textChars), '')).toBeNull();
  });

  it('accepts timestamps within five minutes', () => {
    expect(freshTimestamp(1000, 1000 + COMMUNITY.maxSkewSec)).toBe(true);
    expect(freshTimestamp(1000, 1001 + COMMUNITY.maxSkewSec)).toBe(false);
    expect(freshTimestamp(1.5, 1)).toBe(false);
  });
});
