// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'coverage/*', 'android/*', 'worker/*', 'packs/build/*', 'modules/mesh-engine/core/*'],
  },
  {
    files: ['src/core/engine/**/*.ts'],
    rules: {
      // Engines stay pure: no React, network or platform imports (testable logic first).
      'no-restricted-imports': [
        'error',
        {
          patterns: ['react', 'react-native', 'react-native-*', 'expo-*', 'mesh-engine', '@/ui/*', '@/features/*', '@/state/*'],
        },
      ],
    },
  },
  {
    files: ['src/**/*.tsx', 'app/**/*.tsx'],
    rules: {
      // Icons only through the design system (src/ui/icons).
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['lucide-react-native', 'lucide-react-native/*'], message: 'Use @/ui/icons.' }] },
      ],
    },
  },
  {
    files: ['src/ui/icons/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
