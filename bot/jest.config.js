import { createDefaultPreset, pathsToModuleNameMapper } from 'ts-jest';

import tsconfig from './tsconfig.json' assert { type: 'json' };

const tsJestTransformCfg = createDefaultPreset().transform;

const prefix = '<rootDir>/src/';

const IS_CI = process.env.CI === 'true' || process.env.CI === '1';

/** @type {import("jest").Config} **/
export default {
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['lcov'],
  roots: ['<rootDir>/src/'],
  reporters: IS_CI ? ['default', 'jest-teamcity'] : ['default'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, { prefix }),
  transform: {
    ...tsJestTransformCfg,
  },
};
