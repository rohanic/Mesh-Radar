import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { ROOT } from './lib';

// Runs the Kotlin mesh core tests and the 500-phone simulator through the Gradle wrapper, so no
// global Gradle install is needed (JDK 21 is). Works on Windows, macOS and Linux.
const dir = join(ROOT, 'modules/mesh-engine/core');
const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const r = spawnSync(wrapper, ['test', '--no-daemon', ...process.argv.slice(2)], { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
