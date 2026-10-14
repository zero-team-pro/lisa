import { expect, test } from '@jest/globals';
import { createTaskRequestLimiter } from './nexusTaskRateLimit';

test('bounds unauthenticated audit writes and resets the window', () => {
  const limit = createTaskRequestLimiter();
  const now = Date.now();
  for (let index = 0; index < 30; index += 1) expect(limit(null, now)).toBe(true);
  expect(limit(null, now)).toBe(false);
  expect(limit(null, now + 60_000)).toBe(true);
});

test('limits each authenticated credential independently of unknown requests', () => {
  const limit = createTaskRequestLimiter();
  const now = Date.now();
  for (let index = 0; index < 120; index += 1) expect(limit('credential-a', now)).toBe(true);
  expect(limit('credential-a', now)).toBe(false);
  expect(limit('credential-b', now)).toBe(true);
  expect(limit(null, now)).toBe(true);
});
