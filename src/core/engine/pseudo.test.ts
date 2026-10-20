import { pseudo, pseudoTree } from './pseudo';

describe('pseudo-locale', () => {
  it('accents, brackets and lengthens text', () => {
    const out = pseudo('Send now');
    expect(out.startsWith('[Séñd ñów')).toBe(true);
    expect(out.endsWith(']')).toBe(true);
    expect(out.length).toBeGreaterThan('Send now'.length * 1.3);
  });

  it('keeps placeholders for i18next and the native engine', () => {
    expect(pseudo('Meet at {{pin}}')).toContain('{{pin}}');
    expect(pseudo('{name} needs help')).toContain('{name}');
    expect(pseudo('')).toBe('');
  });

  it('transforms nested resources', () => {
    expect(pseudoTree({ a: { b: 'Hi' }, n: 1 })).toEqual({ a: { b: pseudo('Hi') }, n: 1 });
  });
});
