const babelPresetExpo = require.resolve('babel-preset-expo', { paths: [require.resolve('expo')] });

const moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@config/(.*)$': '<rootDir>/config/$1',
  '^@assets/(.*)$': '<rootDir>/assets/$1',
  '^mesh-engine$': '<rootDir>/modules/mesh-engine',
  '^play-store$': '<rootDir>/modules/play-store',
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'engine',
      testEnvironment: 'node',
      transform: { '^.+\\.(ts|tsx|js)$': ['babel-jest', { presets: [babelPresetExpo] }] },
      testMatch: [
        '<rootDir>/src/core/**/*.test.ts',
        '<rootDir>/scripts/**/*.test.ts',
        '<rootDir>/worker/src/**/*.test.ts',
      ],
      moduleNameMapper,
    },
    {
      displayName: 'app',
      preset: 'jest-expo/android',
      testMatch: ['<rootDir>/src/**/*.test.tsx', '<rootDir>/app/**/*.test.tsx', '<rootDir>/src/features/**/*.test.ts', '<rootDir>/src/state/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: {
        ...moduleNameMapper,
        // Lucide ships ESM .mjs by default; tests use its CommonJS build.
        '^lucide-react-native/icons/(.*)$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|lucide-react-native|react-native-svg|@shopify/react-native-skia|zustand|i18next|react-i18next|qrcode-generator))',
      ],
    },
  ],
  collectCoverageFrom: ['src/core/engine/**/*.ts', '!src/core/engine/**/*.test.ts', '!src/core/engine/**/index.ts', '!src/core/engine/types.ts', '!src/core/engine/testkit.ts'],
  coverageThreshold: {
    './src/core/engine/': { branches: 85, functions: 90, lines: 90, statements: 90 },
  },
};
