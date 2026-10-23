// @ts-check
const { withAppBuildGradle } = require('expo/config-plugins');

// Puts native debug symbols into the release app bundle so Play Console shows function names in
// native crash reports and stops warning that symbols are missing (DEC-047). SYMBOL_TABLE is the
// level Google suggests when FULL would be large; the R8 mapping file is already in the bundle.
const MARKER = '// Native debug symbols for Play Console (DEC-047).';

/** @type {import('expo/config-plugins').ConfigPlugin<{ level?: 'SYMBOL_TABLE' | 'FULL' } | void>} */
module.exports = (config, props) =>
  withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes(MARKER)) {
      const level = (props && props.level) || 'SYMBOL_TABLE';
      c.modResults.contents += `\n${MARKER}\nandroid {\n    buildTypes {\n        release {\n            ndk {\n                debugSymbolLevel '${level}'\n            }\n        }\n    }\n}\n`;
    }
    return c;
  });
