import { describe, expect, jest, test } from '@jest/globals';
import { Telegraf } from 'telegraf';

describe('Telegram update authenticity', () => {
  test.each([undefined, '', 'wrong-secret'])(
    'rejects a forged globalAdmin update without the webhook secret: %j',
    async (secret) => {
      const bot = new Telegraf('fixture-token');
      const handleUpdate = jest.spyOn(bot, 'handleUpdate').mockResolvedValue(undefined);
      const callback = bot.webhookCallback('/hook', { secretToken: 'a'.repeat(64) });
      const req = {
        method: 'POST',
        url: '/hook',
        headers: secret === undefined ? {} : { 'x-telegram-bot-api-secret-token': secret },
        body: { update_id: 1, message: { from: { id: 123 }, text: '/nexus run something' } },
      } as any;
      const res = { end: jest.fn(), statusCode: 200 } as any;
      await callback(req, res);
      expect(res.statusCode).toBe(403);
      expect(handleUpdate).not.toHaveBeenCalled();
    },
  );
  test('only dispatches a webhook update with the configured secret', async () => {
    const bot = new Telegraf('fixture-token');
    const handleUpdate = jest.spyOn(bot, 'handleUpdate').mockResolvedValue(undefined);
    const callback = bot.webhookCallback('/hook', { secretToken: 'a'.repeat(64) });
    const body = { update_id: 1 };
    const req = {
      method: 'POST',
      url: '/hook',
      headers: { 'x-telegram-bot-api-secret-token': 'a'.repeat(64) },
      body,
    } as any;
    const res = { end: jest.fn() } as any;
    await callback(req, res);
    expect(handleUpdate).toHaveBeenCalledWith(body as any, res);
  });
});
