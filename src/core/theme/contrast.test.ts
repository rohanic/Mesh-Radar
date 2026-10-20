import { contrast } from './contrast';
import { groupColours, palettes } from './tokens';

describe('Beacon contrast (section 7, WCAG AA)', () => {
  for (const [name, p] of Object.entries(palettes)) {
    it(`${name}: text pairs reach 4.5:1`, () => {
      const pairs: [string, string, string][] = [
        ['text/bg', p.text, p.bg],
        ['text/surface', p.text, p.surface],
        ['text/raised', p.text, p.surfaceRaised],
        ['muted/bg', p.textMuted, p.bg],
        ['muted/surface', p.textMuted, p.surface],
        ['onPrimary/primary', p.onPrimary, p.primary],
        ['onAccent/accent', p.onAccent, p.accent],
        ['onSos/sos', p.onSos, p.sos],
      ];
      for (const [label, fg, bg] of pairs) expect([label, contrast(fg, bg) >= 4.5]).toEqual([label, true]);
    });
  }

  it('group colours read on their theme background (3:1 for graphics)', () => {
    for (const g of groupColours) {
      expect(contrast(g.light, palettes.light.bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(g.dark, palettes.dark.bg)).toBeGreaterThanOrEqual(3);
    }
  });
});
