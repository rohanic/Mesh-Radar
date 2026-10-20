import { NUMBER_KINDS } from '../src/core/engine/numbers';
import { EventPackSchema, LAUNCH_PACKS } from '../src/core/packs/schema';
import { finish, read, readJson, walk } from './lib';

// Release gate (DEC-004). Blocks a production build until people have verified the safety
// content: emergency numbers, translations, event packs, and the open decisions.
// `--if-gated` makes it a no-op unless MR_RELEASE_GATE=1 (set by the EAS production profile).

if (process.argv.includes('--if-gated') && process.env.MR_RELEASE_GATE !== '1') {
  console.log('check:release: skipped (not a production build)');
  process.exit(0);
}

const problems: string[] = [];
const warnings: string[] = [];

// 1. Emergency numbers (E5).
interface Num {
  id: string;
  kind: string;
  number: string;
  source: string;
  verified: boolean;
}
const countries = readJson<{ countries: Record<string, { numbers: Num[] }> }>('config/emergency-numbers.json').countries;
if (!Object.keys(countries).length) problems.push('emergency numbers: none configured');
for (const [code, c] of Object.entries(countries)) {
  for (const n of c.numbers) {
    if (!n.verified) problems.push(`emergency numbers: ${code} ${n.number} (${n.id}) is not verified`);
    if (!/^https:\/\//.test(n.source)) problems.push(`emergency numbers: ${code} ${n.id} has no https source`);
    if (!/^\d+$/.test(n.number)) problems.push(`emergency numbers: ${code} ${n.id} is not digits only`);
    if (!(NUMBER_KINDS as readonly string[]).includes(n.kind)) problems.push(`emergency numbers: ${code} ${n.id} has unknown kind ${n.kind}`);
  }
}

// 2. Translations (section 11): safety strings professionally translated, the rest reviewed.
const status = readJson<Record<string, { verified: boolean; safetyVerified: boolean }>>('src/i18n/status.json');
for (const [lang, s] of Object.entries(status)) {
  if (!s.safetyVerified) problems.push(`translations: ${lang} safety strings are not verified (src/i18n/status.json)`);
  if (!s.verified) problems.push(`translations: ${lang} is not reviewed (src/i18n/status.json)`);
}

// 3. Event packs (F1): bundled copy matches the sources and every pack is verified.
const bundled = (JSON.parse(read('src/features/packs/bundled.json')) as unknown[]).map((p) => EventPackSchema.parse(p));
for (const id of LAUNCH_PACKS) {
  const b = bundled.find((p) => p.id === id);
  if (!b) {
    problems.push(`packs: ${id} is not bundled (run npm run packs:build)`);
    continue;
  }
  if (!b.verified) problems.push(`packs: ${id} is not verified`);
}
for (const file of walk('packs/src', ['.json'])) {
  const src = EventPackSchema.parse(JSON.parse(read(file)));
  const b = bundled.find((p) => p.id === src.id);
  if (b && JSON.stringify(b) !== JSON.stringify(src)) problems.push(`packs: ${src.id} bundled copy is out of date (run npm run packs:build)`);
}

// 4. Build configuration: public values the release build needs.
const pk = process.env.EXPO_PUBLIC_LICENCE_PUBLIC_KEY ?? '';
if (!/^[0-9a-f]{64}$/i.test(pk)) problems.push('env: EXPO_PUBLIC_LICENCE_PUBLIC_KEY must be the 64-hex Ed25519 public key');
const api = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
if (!/^https:\/\//.test(api)) problems.push('env: EXPO_PUBLIC_API_BASE_URL must be an https URL');

// 5. Open decisions that need Rohan.
for (const line of read('docs/decisions.md').split('\n')) {
  const m = line.match(/\*\*(DEC-\d+)[^*]*\(NEEDS ROHAN\)/);
  if (m) problems.push(`decisions: ${m[1]} still needs a decision (docs/decisions.md)`);
}

// 6. Recorded voice clips for quick replies (DEC-032). Missing clips do not block release.
const clips = read('src/features/sound/voiceClips.ts');
for (const lang of Object.keys(status)) {
  for (let code = 1; code <= 7; code++) {
    if (!new RegExp(`${lang}\\s*:\\s*\\{[^}]*\\b${code}\\s*:`).test(clips)) {
      warnings.push(`voice clips: ${lang} has no clips yet (DEC-032)`);
      break;
    }
  }
}

finish('check:release', problems, warnings);
