import { createDefaultPreset, pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'node:fs';

const tsconfig = JSON.parse(readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8'));

const tsJestTransformCfg = createDefaultPreset().transform;

const prefix = '<rootDir>/src/';

const IS_CI = process.env.CI === 'true' || process.env.CI === '1';

/** @type {import("jest").Config} **/
export default {
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverage: IS_CI,
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
