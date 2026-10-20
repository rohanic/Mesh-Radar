import { finish, read, walk } from './lib';

// Copy rules (CLAUDE.md rule 10): no emojis, no em dashes, no en dashes anywhere a person could
// read them: UI strings, packs, config, native notification text, the Worker and docs we wrote.
// docs/PRD.md is the source document and is exempt.

const RULES: [RegExp, string][] = [
  [/—/u, 'em dash'],
  [/–/u, 'en dash'],
  [/\p{Extended_Pictographic}/u, 'emoji'],
  [/️/u, 'emoji variation selector'],
];

const files = [
  ...walk('app', ['.ts', '.tsx']),
  ...walk('src', ['.ts', '.tsx', '.json']),
  ...walk('config', ['.json']),
  ...walk('packs', ['.json']),
  ...walk('modules/mesh-engine', ['.kt', '.ts', '.xml']),
  ...walk('worker', ['.ts', '.json', '.toml']),
  ...walk('docs', ['.md']).filter((f) => f !== 'docs/PRD.md'),
  'app.config.ts',
  'README.md',
  'CLAUDE.md',
].filter((f, i, all) => all.indexOf(f) === i);

const problems: string[] = [];
for (const f of files) {
  let text: string;
  try {
    text = read(f);
  } catch {
    continue;
  }
  text.split('\n').forEach((line, i) => {
    for (const [re, what] of RULES) if (re.test(line)) problems.push(`${f}:${i + 1}: ${what}: ${line.trim().slice(0, 100)}`);
  });
}
finish('check:copy', problems);
