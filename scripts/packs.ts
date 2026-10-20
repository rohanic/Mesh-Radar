import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { EventPackSchema, LAUNCH_PACKS, MAX_PACK_BYTES, type EventPack } from '../src/core/packs/schema';
import { ROOT, finish, read, readJson, walk } from './lib';

// Event pack pipeline (F1, F2, DEC-031).
//   validate  check every source pack in packs/src
//   build     validate, then write the bundled copy (src/features/packs/bundled.json) and one
//             minified file per pack in packs/build for the Worker
//   publish   upload packs/build to the Worker, which signs each pack with the licence key
//             (the private key never leaves the Worker). Needs MR_API_BASE_URL and MR_ADMIN_TOKEN.


function load(): { packs: EventPack[]; problems: string[]; warnings: string[] } {
  const problems: string[] = [];
  const warnings: string[] = [];
  const packs: EventPack[] = [];
  const numbers = readJson<{ countries: Record<string, unknown> }>('config/emergency-numbers.json').countries;

  for (const file of walk('packs/src', ['.json'])) {
    const name = file.split('/').pop()!.replace(/\.json$/, '');
    let raw: unknown;
    try {
      raw = JSON.parse(read(file));
    } catch (e) {
      problems.push(`${file}: invalid JSON (${(e as Error).message})`);
      continue;
    }
    const parsed = EventPackSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) problems.push(`${file}: ${issue.path.join('.')}: ${issue.message}`);
      continue;
    }
    const p = parsed.data;
    if (p.id !== name) problems.push(`${file}: id "${p.id}" does not match the file name`);
    if (packs.some((x) => x.id === p.id)) problems.push(`${file}: duplicate id ${p.id}`);
    const bytes = Buffer.byteLength(JSON.stringify(p));
    if (bytes > MAX_PACK_BYTES) problems.push(`${file}: ${bytes} bytes is over the 2 MB limit`);
    for (const d of p.dates) if (d.end < d.start) problems.push(`${file}: date ${d.start} ends before it starts`);
    for (const s of p.sources) if (!s.startsWith('https://')) problems.push(`${file}: source is not https: ${s}`);
    if (!p.sources.length) problems.push(`${file}: no sources`);
    if (p.community) problems.push(`${file}: launch packs are not community packs`);
    for (const c of p.countries) if (!numbers[c]) warnings.push(`${file}: no emergency numbers for ${c}`);
    if (p.verified) warnings.push(`${file}: marked verified; make sure a person checked it`);
    packs.push(p);
  }
  for (const id of LAUNCH_PACKS) if (!packs.some((p) => p.id === id)) problems.push(`packs/src/${id}.json: launch pack missing`);
  const order = (id: string) => (LAUNCH_PACKS as readonly string[]).indexOf(id);
  packs.sort((a, b) => order(a.id) - order(b.id));
  return { packs, problems, warnings };
}

async function publish() {
  const base = process.env.MR_API_BASE_URL?.replace(/\/$/, '');
  const token = process.env.MR_ADMIN_TOKEN;
  if (!base || !token) {
    console.error('packs:publish needs MR_API_BASE_URL and MR_ADMIN_TOKEN');
    process.exit(1);
  }
  const { packs, problems } = load();
  if (problems.length) finish('packs:publish', problems);
  for (const p of packs) {
    const r = await fetch(`${base}/v1/admin/packs/${p.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(p),
    });
    console.log(`${p.id}: ${r.status}`);
    if (!r.ok) process.exitCode = 1;
  }
}

const mode = process.argv[2];
if (mode === 'publish') {
  void publish();
} else {
  const { packs, problems, warnings } = load();
  if (mode === 'build' && !problems.length) {
    writeFileSync(join(ROOT, 'src/features/packs/bundled.json'), `${JSON.stringify(packs)}\n`);
    mkdirSync(join(ROOT, 'packs/build'), { recursive: true });
    for (const p of packs) writeFileSync(join(ROOT, 'packs/build', `${p.id}.json`), JSON.stringify(p));
    const kb = Math.round(Buffer.byteLength(JSON.stringify(packs)) / 1024);
    console.log(`built ${packs.length} packs, ${kb} KB bundled`);
  }
  finish(`packs:${mode ?? 'validate'}`, problems, warnings);
}
