// @ts-check
const { withGradleProperties, withProjectBuildGradle } = require('expo/config-plugins');

// Keeps release builds inside the memory of an EAS Android builder (4 vCPUs, about 16 GB; DEC-052).
// Production builds were killed while R8 ran beside the C++ builds of Skia, Reanimated and Worklets:
// each native build starts one compiler per core whatever Gradle's worker count is. So:
// - two Gradle workers, so R8 shares the machine with at most one native build;
// - the Kotlin compiler runs inside Gradle instead of in its own daemon process;
// - every native build runs at most two compile jobs and one link (CMake job pools, Ninja).
// EAS sets the Gradle heap itself (GRADLE_OPTS); the jvmargs here are for local release builds.
const PROPERTIES = {
  'org.gradle.workers.max': '2',
  'kotlin.compiler.execution.strategy': 'in-process',
  'org.gradle.jvmargs': '-Xmx4g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8',
};

const MARKER = '// Native build job limits (DEC-052).';
const NATIVE_LIMITS = `
${MARKER}
subprojects { sub ->
  ['com.android.library', 'com.android.application'].each { id ->
    sub.plugins.withId(id) {
      sub.android.defaultConfig.externalNativeBuild.cmake.arguments(
        '-DCMAKE_JOB_POOLS=compile=2;link=1',
        '-DCMAKE_JOB_POOL_COMPILE=compile',
        '-DCMAKE_JOB_POOL_LINK=link'
      )
    }
  }
}
`;

/** @type {import('expo/config-plugins').ConfigPlugin} */
module.exports = (config) => {
  config = withGradleProperties(config, (c) => {
    c.modResults = c.modResults.filter((p) => !(p.type === 'property' && p.key === 'kotlin.daemon.jvmargs'));
    for (const [key, value] of Object.entries(PROPERTIES)) {
      const item = c.modResults.find((p) => p.type === 'property' && p.key === key);
      if (item && item.type === 'property') item.value = value;
      else c.modResults.push({ type: 'property', key, value });
    }
    return c;
  });
  return withProjectBuildGradle(config, (c) => {
    if (c.modResults.language === 'groovy' && !c.modResults.contents.includes(MARKER)) c.modResults.contents += NATIVE_LIMITS;
    return c;
  });
};
