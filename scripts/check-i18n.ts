import { SAFETY_PREFIXES } from '../src/i18n/safety-keys';
import { finish, readJson, strings, walk } from './lib';

// Every language has every key (section 11), with the plural forms its CLDR rules need, the same
// placeholders as English, and an entry in status.json.

const PLURAL = /_(zero|one|two|few|many|other)$/;
const DOUBLE = /\{\{\s*(\w+)\s*\}\}/g;
// Single-brace placeholders are filled by the Kotlin engine in native notification strings.
const SINGLE = /(?<!\{)\{(\w+)\}(?!\})/g;

const placeholders = (s: string) => new Set([...s.matchAll(DOUBLE), ...s.matchAll(SINGLE)].map((m) => m[0].replace(/\s/g, '')));
const flat = (lang: string) => new Map(strings(readJson(`src/i18n/locales/${lang}.json`)));

const en = flat('en');
const pluralBases = new Set([...en.keys()].filter((k) => k.endsWith('_other')).map((k) => k.replace(PLURAL, '')));
const langs = walk('src/i18n/locales', ['.json']).map((f) => f.split('/').pop()!.replace('.json', ''));
const status = readJson<Record<string, { verified: boolean; safetyVerified: boolean }>>('src/i18n/status.json');

const problems: string[] = [];

for (const p of SAFETY_PREFIXES) if (![...en.keys()].some((k) => k.startsWith(p))) problems.push(`safety-keys: no English key starts with "${p}"`);

for (const lang of langs) {
  if (!status[lang]) problems.push(`status.json: no entry for ${lang}`);
  if (lang === 'en') continue;
  const tr = flat(lang);
  const categories = new Intl.PluralRules(lang).resolvedOptions().pluralCategories as string[];

  const expected = new Map<string, string>();
  for (const [k, v] of en) {
    const base = k.replace(PLURAL, '');
    if (!pluralBases.has(base)) expected.set(k, v);
    else if (k.endsWith('_zero')) expected.set(k, v);
  }
  for (const base of pluralBases) for (const c of categories) expected.set(`${base}_${c}`, en.get(`${base}_other`)!);

  for (const [k, source] of expected) {
    const v = tr.get(k);
    if (v === undefined) {
      problems.push(`${lang}: missing ${k}`);
      continue;
    }
    if (source !== '' && v.trim() === '') problems.push(`${lang}: empty ${k}`);
    const want = placeholders(source);
    const got = placeholders(v);
    const isPlural = pluralBases.has(k.replace(PLURAL, ''));
    // Zero, one and two forms often spell out the number (Arabic "two phones" is one word).
    const spelled = isPlural && /_(zero|one|two)$/.test(k);
    for (const p of got) if (!want.has(p)) problems.push(`${lang}: ${k} has unknown placeholder ${p}`);
    for (const p of want) if (!got.has(p) && !(spelled || (isPlural && p === '{{count}}'))) problems.push(`${lang}: ${k} is missing placeholder ${p}`);
  }
  for (const k of tr.keys()) if (!expected.has(k)) problems.push(`${lang}: extra key ${k}`);
}

for (const lang of Object.keys(status)) if (!langs.includes(lang)) problems.push(`status.json: ${lang} has no locale file`);

finish('check:i18n', problems);
