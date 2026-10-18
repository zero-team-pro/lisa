import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  routeNexusInput,
  validateOperation,
  validateCaptureResult,
  validateOperationCapabilities,
} from './nexusTaskRouting';
const fixtures = JSON.parse(readFileSync(join(process.cwd(), 'src/services/nexusTaskRouting.fixtures.json'), 'utf8'));

describe('Nexus capture routing contract shared with Mac', () => {
  for (const fixture of fixtures.cases)
    test(fixture.name, () => expect(routeNexusInput(fixture.input)).toEqual(fixture.expected));
  test('rejects credential-bearing/lookalike URLs, model keys and unknown versions', () => {
    const operation = fixtures.cases[0].expected.operation;
    for (const changes of [
      { url: 'https://user:password@vt.tiktok.com/a' },
      { url: 'https://vt.tiktok.com.evil.test/a' },
      { model: 'sol' },
      { version: 2 },
      { routingVersion: 2 },
      { note: 'a'.repeat(8001) },
    ]) {
      expect(() => validateOperation({ ...operation, ...changes })).toThrow();
    }
    expect(validateOperation(null)).toBeNull();
  });
  test('capability claims are explicit, unique and bounded', () => {
    expect(validateOperationCapabilities(undefined)).toEqual([]);
    expect(validateOperationCapabilities(['tiktok.capture.v1'])).toEqual(['tiktok.capture.v1']);
    for (const value of [null, 'tiktok.capture.v1', ['unknown'], ['tiktok.capture.v1', 'tiktok.capture.v1']])
      expect(() => validateOperationCapabilities(value)).toThrow();
  });
  test('capture result requires truthful success or failure state', () => {
    expect(validateCaptureResult({ libraryId: '00001', state: 'saved', reasonCode: null }, 'completed').libraryId).toBe(
      '00001',
    );
    expect(() => validateCaptureResult({ libraryId: null, state: 'saved', reasonCode: null }, 'completed')).toThrow();
    expect(() =>
      validateCaptureResult({ libraryId: '00000', state: 'saved', reasonCode: null }, 'completed'),
    ).toThrow();
    expect(() => validateCaptureResult({ libraryId: null, state: 'none', reasonCode: 'unknown' }, 'failed')).toThrow();
  });
});
