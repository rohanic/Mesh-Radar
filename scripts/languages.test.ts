import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { availableLanguages, LANGUAGES } from '../src/i18n/languages';
import status from '../src/i18n/status.json';
import { ROOT } from './lib';

// DEC-050: release builds offer only languages whose safety text has a reviewer.

describe('released languages', () => {
  const released = Object.entries(status)
    .filter(([, s]) => s.released)
    .map(([code]) => code)
    .sort();

  it('release builds offer exactly the released languages, development builds all of them', () => {
    expect(availableLanguages(false).map((l) => l.code).sort()).toEqual(released);
    expect(availableLanguages(true)).toHaveLength(LANGUAGES.length);
    expect(released).toContain('en');
  });

  it("Android's per-app language list matches the released languages", () => {
    const config = readFileSync(join(ROOT, 'app.config.ts'), 'utf8');
    const locales = /supportedLocales: \[([^\]]*)\]/.exec(config)?.[1] ?? '';
    expect(locales.match(/'([a-z]+)'/g)?.map((s) => s.replace(/'/g, '')).sort()).toEqual(released);
  });
});
