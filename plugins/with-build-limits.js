// @ts-check
const { withGradleProperties } = require('expo/config-plugins');

// Keeps release builds inside the memory of an EAS Android builder (4 vCPUs, about 16 GB; DEC-052).
// The first production builds were killed while R8 ran beside C++ builds for four ABIs. Two Gradle
// workers stop R8 and several native compiles from running at once, and the Kotlin daemon gets its
// own cap so the three processes fit together. EAS sets the Gradle heap itself (GRADLE_OPTS).
const LIMITS = {
  'org.gradle.workers.max': '2',
  'kotlin.daemon.jvmargs': '-Xmx1536m',
  // Local release builds (EAS overrides this with its own heap).
  'org.gradle.jvmargs': '-Xmx4g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8',
};

/** @type {import('expo/config-plugins').ConfigPlugin} */
module.exports = (config) =>
  withGradleProperties(config, (c) => {
    for (const [key, value] of Object.entries(LIMITS)) {
      const item = c.modResults.find((p) => p.type === 'property' && p.key === key);
      if (item && item.type === 'property') item.value = value;
      else c.modResults.push({ type: 'property', key, value });
    }
    return c;
  });
