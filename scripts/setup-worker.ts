import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

import { ROOT } from './lib';

// One guided run of docs/setup.md sections 2 to 4: the licence key pair, the KV namespace, the three
// Worker secrets, the deploy and the app's public values. Safe to run again: it never replaces a
// secret that is already set, because a new licence key would invalidate every licence issued.
//
//   npx wrangler login                                   (once)
//   npm run setup:worker -- --service-account ~/Downloads/play-service-account.json
//
// Secrets go straight from this process to `wrangler secret put` on stdin; nothing is written to
// disk except the public values in .env. The licence seed is printed once for the password manager.

const WORKER = join(ROOT, 'worker');
const TOML = join(WORKER, 'wrangler.toml');
const ENV_FILE = join(ROOT, '.env');
const PLACEHOLDER = 'REPLACE_WITH_KV_NAMESPACE_ID';

function wrangler(args: string[], opts: { input?: string; capture?: boolean } = {}) {
  const r = spawnSync('npx', ['wrangler', ...args], {
    cwd: WORKER,
    input: opts.input,
    encoding: 'utf8',
    stdio: opts.capture || opts.input != null ? ['pipe', 'pipe', 'pipe'] : 'inherit',
    shell: process.platform === 'win32',
  });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function fail(msg: string): never {
  console.error(`\nsetup:worker stopped: ${msg}`);
  process.exit(1);
}

function setEnv(key: string, value: string) {
  const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8').split('\n') : [];
  const i = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (i >= 0) lines[i] = `${key}=${value}`;
  else lines.splice(lines.length && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length, 0, `${key}=${value}`);
  writeFileSync(ENV_FILE, lines.join('\n').replace(/\n*$/, '\n'));
}

async function main() {
  const argv = process.argv.slice(2);
  const saIndex = argv.indexOf('--service-account');
  const saPath = saIndex >= 0 ? argv[saIndex + 1] : undefined;
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  // 0. Signed in to Cloudflare?
  const who = wrangler(['whoami'], { capture: true });
  if (!who.ok || /not authenticated/i.test(who.out)) fail('run `npx wrangler login` first, then run this again.');
  console.log('Cloudflare: signed in.');

  // 1. KV namespace for signed packs, purchase bindings and first-pilgrimage claims (DEC-038).
  let toml = readFileSync(TOML, 'utf8');
  if (toml.includes(PLACEHOLDER)) {
    const kv = wrangler(['kv', 'namespace', 'create', 'KV'], { capture: true });
    const id = /id\W+([0-9a-f]{32})/.exec(kv.out)?.[1];
    if (!kv.ok || !id) fail(`could not create the KV namespace:\n${kv.out}`);
    toml = toml.replace(PLACEHOLDER, id);
    writeFileSync(TOML, toml);
    console.log(`KV namespace created (${id}) and written to worker/wrangler.toml. Commit that file.`);
  } else {
    console.log('KV namespace: already set in worker/wrangler.toml.');
  }

  // 2. Deploy first, so the secrets below attach to an existing Worker.
  console.log('\nDeploying the Worker...');
  if (!wrangler(['deploy']).ok) fail('wrangler deploy failed (see above).');
  const url = (await rl.question('\nPaste the Worker URL printed above (https://mesh-radar.<name>.workers.dev or your own domain): ')).trim().replace(/\/+$/, '');
  if (!/^https:\/\/[^\s/]+$/.test(url)) fail(`"${url}" is not an https origin.`);

  // 3. Secrets. Never replace one that exists.
  const listed = wrangler(['secret', 'list', '--format', 'json'], { capture: true });
  const have = new Set<string>(listed.ok ? (JSON.parse(listed.out.slice(listed.out.indexOf('['))) as { name: string }[]).map((s) => s.name) : []);

  let publicKey = '';
  if (!have.has('LICENCE_SIGNING_SEED')) {
    const k = generateKeyPairSync('ed25519');
    const seed = k.privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(16).toString('hex');
    publicKey = k.publicKey.export({ format: 'der', type: 'spki' }).subarray(12).toString('hex');
    if (!wrangler(['secret', 'put', 'LICENCE_SIGNING_SEED'], { input: seed }).ok) fail('could not set LICENCE_SIGNING_SEED.');
    console.log('\n================ SAVE THIS NOW ================');
    console.log('Licence signing seed (private key). Put it in your password manager as "Mesh Radar licence seed".');
    console.log('If it is lost, every licence issued so far stops working in new app builds.');
    console.log(`\n  ${seed}\n`);
    console.log('This is the only time it is shown. It is not saved anywhere else.');
    console.log('===============================================');
    await rl.question('Press Enter once it is saved...');
  } else {
    console.log('LICENCE_SIGNING_SEED: already set, kept as it is.');
  }

  if (!have.has('ADMIN_TOKEN')) {
    const token = randomBytes(32).toString('hex');
    if (!wrangler(['secret', 'put', 'ADMIN_TOKEN'], { input: token }).ok) fail('could not set ADMIN_TOKEN.');
    console.log(`\nADMIN_TOKEN (for npm run packs:publish). Save it in your password manager too:\n\n  ${token}\n`);
  } else {
    console.log('ADMIN_TOKEN: already set, kept as it is.');
  }

  if (!have.has('GOOGLE_SERVICE_ACCOUNT_JSON')) {
    if (saPath) {
      const raw = readFileSync(saPath.replace(/^~(?=\/)/, process.env.HOME ?? '~'), 'utf8');
      const sa = JSON.parse(raw) as { client_email?: string; private_key?: string };
      if (!sa.client_email || !sa.private_key) fail('that file is not a Google service account key (no client_email or private_key).');
      if (!wrangler(['secret', 'put', 'GOOGLE_SERVICE_ACCOUNT_JSON'], { input: raw }).ok) fail('could not set GOOGLE_SERVICE_ACCOUNT_JSON.');
      console.log(`GOOGLE_SERVICE_ACCOUNT_JSON: set for ${sa.client_email}. You can delete the downloaded file now.`);
    } else {
      console.log('\nGOOGLE_SERVICE_ACCOUNT_JSON: not set yet. Purchases cannot be verified until it is.');
      console.log('Run again later with: npm run setup:worker -- --service-account <path to the JSON key>');
    }
  } else {
    console.log('GOOGLE_SERVICE_ACCOUNT_JSON: already set, kept as it is.');
  }

  // 4. Check the live Worker and write the public values the app is built with.
  const health = await fetch(`${url}/v1/health`).then((r) => r.ok).catch(() => false);
  const live = await fetch(`${url}/v1/licence/public-key`)
    .then((r) => r.json() as Promise<{ publicKey?: string }>)
    .then((j) => j.publicKey ?? '')
    .catch(() => '');
  if (!health || !/^[0-9a-f]{64}$/.test(live)) fail(`the Worker at ${url} did not answer /v1/health and /v1/licence/public-key.`);
  if (publicKey && live !== publicKey) fail('the live public key does not match the seed just set. Wait a minute and run again.');

  setEnv('EXPO_PUBLIC_API_BASE_URL', url);
  setEnv('EXPO_PUBLIC_LICENCE_PUBLIC_KEY', live);
  console.log(`\nDone. .env now has:\n  EXPO_PUBLIC_API_BASE_URL=${url}\n  EXPO_PUBLIC_LICENCE_PUBLIC_KEY=${live}`);
  console.log('\nSet the same two values for EAS production builds (they are public, not secrets):');
  console.log(`  eas env:set --environment production --name EXPO_PUBLIC_API_BASE_URL --value ${url} --visibility plaintext`);
  console.log(`  eas env:set --environment production --name EXPO_PUBLIC_LICENCE_PUBLIC_KEY --value ${live} --visibility plaintext`);
  rl.close();
}

void main();
