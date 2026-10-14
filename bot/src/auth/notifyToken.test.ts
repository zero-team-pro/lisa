import { describe, expect, test } from '@jest/globals';

import { authenticateNotifyToken, getBearerToken, parseNotifyTokens } from './notifyToken';

describe('notify token authentication', () => {
  test('parses multiple token owners and signed Telegram chat ids', () => {
    expect(parseNotifyTokens('first:123, second:-456')).toEqual(
      new Map([
        ['first', 123],
        ['second', -456],
      ]),
    );
  });

  test('accepts only configured bearer tokens', () => {
    expect(getBearerToken('Bearer secret')).toBe('secret');
    expect(authenticateNotifyToken('Bearer secret', 'secret:-123')).toEqual({ token: 'secret', chatId: -123 });
    expect(authenticateNotifyToken('Bearer other', 'secret:-123')).toBeNull();
    expect(authenticateNotifyToken(undefined, 'secret:-123')).toBeNull();
  });
});
