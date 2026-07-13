import { describe, expect, test } from '@jest/globals';
import { parseNotifyTokens } from './notify';

describe('parseNotifyTokens', () => {
  test('parses multiple tokens and Telegram chat ids', () => {
    expect(parseNotifyTokens('first:123, second:-456')).toEqual(
      new Map([
        ['first', 123],
        ['second', -456],
      ]),
    );
  });

  test('ignores malformed entries and supports an unset value', () => {
    expect(parseNotifyTokens('invalid,no-chat-id:abc,:123')).toEqual(new Map());
    expect(parseNotifyTokens()).toEqual(new Map());
  });
});
