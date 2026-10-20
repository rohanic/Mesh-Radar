import { base64ToBytes, cardName, utf8Decode } from './b64';

describe('base64 helpers', () => {
  it('decodes standard and url-safe base64', () => {
    expect(Array.from(base64ToBytes('AQID'))).toEqual([1, 2, 3]);
    expect(utf8Decode(base64ToBytes('aGVsbG8'))).toBe('hello');
  });

  it('decodes multi-byte UTF-8 names from lost-child cards', () => {
    // "عائشة" in UTF-8, base64url without padding.
    const b64 = Buffer.from('عائشة', 'utf8').toString('base64url');
    expect(cardName(`key.${b64}`)).toBe('عائشة');
    expect(cardName('nokey')).toBe('');
  });
});
