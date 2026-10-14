import { expect, test } from '@jest/globals';
import { telegramLogText } from './telegramLogText';

test.each([
  '/linkMe secret-token',
  '/LINKME@LisaBot secret-token',
  '/nexus private instruction',
  '/nexus\nprivate instruction',
])('redacts sensitive Telegram command contents: %j', (text) => {
  expect(telegramLogText(text)).toBe('[sensitive command redacted]');
});

test('preserves ordinary message logging', () => expect(telegramLogText('hello')).toBe('hello'));
