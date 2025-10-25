import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: ['**/tests/pact/**/*.spec.ts'],
  collectCoverageFrom: ['tests/pact/**/*.ts'],
  coverageDirectory: 'coverage/pact',
  testTimeout: 30000, // Pact tests may take longer
};

export default config;
