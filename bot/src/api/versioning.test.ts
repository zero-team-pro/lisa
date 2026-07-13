import { describe, expect, it, jest } from '@jest/globals';
import express from 'express';

import { createVersionedRouter, extendVersionHandlers } from './versioning';

describe('createVersionedRouter', () => {
  it('mounts a contract only below its explicit major version', () => {
    const v1 = express.Router().get('/', (_req, res) => res.sendStatus(204));
    const router = createVersionedRouter({ v1 }) as express.Router & {
      stack: Array<{ regexp: RegExp }>;
    };
    const [versionLayer] = router.stack;

    expect(versionLayer.regexp.test('/v1')).toBe(true);
    expect(versionLayer.regexp.test('/v1/resource')).toBe(true);
    expect(versionLayer.regexp.test('/')).toBe(false);
    expect(versionLayer.regexp.test('/v2')).toBe(false);
  });

  it('rejects invalid major version names', () => {
    const router = express.Router();
    expect(() => createVersionedRouter({ beta: router } as never)).toThrow('Invalid API major version: beta');
  });
});

describe('extendVersionHandlers', () => {
  it('reuses unchanged handlers and replaces only explicit overrides', () => {
    const list = jest.fn();
    const getV1 = jest.fn();
    const getV2 = jest.fn();
    const v1 = { list, get: getV1 };

    const v2 = extendVersionHandlers(v1, { get: getV2 });

    expect(v2).toEqual({ list, get: getV2 });
    expect(v1).toEqual({ list, get: getV1 });
  });
});
