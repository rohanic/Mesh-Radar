import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, walk } from './lib';

// Zustand 5 selectors must return a stable value. A selector that builds a new array or object
// (filter, map, `?? []`, an object literal) makes React re-render forever ("Maximum update depth
// exceeded"), which took down the Radar tab and Elder mode. Such selectors go through useShallow.

const STORE_CALL = /use(?:Mesh|Settings|Packs|Profile|Social|Purchases|Prompts)\(\s*\(\w+\)\s*=>/g;

/** The selector bodies on a line: the text inside each `useStore((s) => ...)` call, up to its closing parenthesis. */
function selectorBodies(line: string): string[] {
  const out: string[] = [];
  for (const m of line.matchAll(STORE_CALL)) {
    let depth = 1;
    let i = (m.index ?? 0) + m[0].indexOf('(') + 1;
    const start = i;
    for (; i < line.length && depth > 0; i++) {
      if (line[i] === '(') depth++;
      else if (line[i] === ')') depth--;
    }
    out.push(line.slice(start, i - 1));
  }
  return out;
}

const BUILDS_NEW = /\.(filter|map|slice|concat|sort|flatMap)\(|\?\? \[\]|\?\? \{\}|: \[\]\)|=> \(\{|=> \[|Object\.(values|entries|keys)\([^)]*\)(?!\.length)(?!\.reduce)/;

describe('store selectors', () => {
  it('never build a new array or object without useShallow', () => {
    const offenders: string[] = [];
    for (const file of [...walk('app', ['.ts', '.tsx']), ...walk('src', ['.ts', '.tsx'])]) {
      readFileSync(join(ROOT, file), 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (selectorBodies(line).some((body) => BUILDS_NEW.test(body))) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it('catches the pattern that crashed the Radar tab', () => {
    const flagged = (line: string) => selectorBodies(line).some((body) => BUILDS_NEW.test(body));
    expect(flagged('useMesh((s) => s.groups.filter((g) => !g.archived));')).toBe(true);
    expect(flagged('useMesh(useShallow((s) => s.groups.filter((g) => !g.archived)));')).toBe(false);
    expect(flagged('usePacks((s) => Object.keys(s.installed).length);')).toBe(false);
    expect(flagged('useSettings((s) => s.language) ?? matchDeviceLanguage(getLocales().map((l) => l.languageTag));')).toBe(false);
  });
});
