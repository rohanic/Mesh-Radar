import { execSync } from 'node:child_process';

import { finish, read, walk } from './lib';

// No secrets in the repo or the app bundle (CLAUDE.md rule 7). Licence signing keys and store
// credentials live only in the Worker's encrypted secrets.

const PATTERNS: [RegExp, string][] = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'PEM private key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/xox[abprs]-[0-9A-Za-z-]{10,}/, 'Slack token'],
  [/gh[pousr]_[0-9A-Za-z]{36,}/, 'GitHub token'],
  [/sntrys_[0-9A-Za-z_=+/]{20,}/, 'Sentry auth token'],
  [/"private_key"\s*:/, 'service account JSON'],
  [/\b(sk|rk)_live_[0-9A-Za-z]{10,}/, 'live API key'],
  // A 64-byte Ed25519 secret key or a 32-byte seed written as a constant next to a secret-ish name.
  [/(secret|private|seed|signing)[\w]*\s*[:=]\s*['"`][0-9a-fA-F]{64,128}['"`]/i, 'hex key material'],
];

// Everything that can end up in the app bundle or the repo's shipped code.
const files = [
  ...walk('app', ['.ts', '.tsx']),
  ...walk('src', ['.ts', '.tsx', '.json']),
  ...walk('config', ['.json']),
  ...walk('modules/mesh-engine', ['.kt', '.ts', '.gradle', '.xml', '.json']),
  ...walk('worker', ['.ts', '.toml', '.json']),
  ...walk('scripts', ['.ts']).filter((f) => f !== 'scripts/check-secrets.ts'),
  ...walk('.github', ['.yml', '.yaml']),
  'app.config.ts',
  'eas.json',
  '.env.example',
];

const problems: string[] = [];
for (const f of files) {
  let text: string;
  try {
    text = read(f);
  } catch {
    continue;
  }
  text.split('\n').forEach((line, i) => {
    for (const [re, what] of PATTERNS) if (re.test(line)) problems.push(`${f}:${i + 1}: looks like a ${what}`);
  });
}

// Only EXPO_PUBLIC_ values reach the app, and none of them may be a secret.
for (const f of [...walk('app', ['.ts', '.tsx']), ...walk('src', ['.ts', '.tsx']), 'app.config.ts']) {
  for (const m of read(f).matchAll(/process\.env\.(\w+)/g)) {
    const name = m[1]!;
    if (/SECRET|PRIVATE|PASSWORD|AUTH_TOKEN|SIGNING/i.test(name)) problems.push(`${f}: reads ${name} into the app bundle`);
  }
}

// No env files or keystores tracked by git.
try {
  const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n');
  for (const t of tracked) {
    if (/(^|\/)\.env(\..+)?$/.test(t) && !t.endsWith('.env.example')) problems.push(`${t}: env file is tracked by git`);
    if (/\.(jks|keystore|p8|p12|pem|key)$/.test(t)) problems.push(`${t}: key file is tracked by git`);
    if (/(^|\/)\.dev\.vars$/.test(t)) problems.push(`${t}: Worker local secrets file is tracked by git`);
  }
} catch {
  // Not a git checkout (for example a source archive): file scan above still applies.
}

finish('check:secrets', problems);
