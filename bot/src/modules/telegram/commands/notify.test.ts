import { describe, expect, jest, test } from '@jest/globals';
jest.mock('@/services/nexusChat', () => ({ rememberNexusChatMessage: jest.fn() }));
jest.mock('@/models', () => ({
  NexusTaskNotification: { findOne: jest.fn(), update: jest.fn() },
  sequelize: { fn: jest.fn(), col: jest.fn() },
}));
jest.mock('@/services/nexusTaskAuthorization', () => ({ requireNexusTaskOwner: jest.fn() }));
import { NexusTaskNotification } from '@/models';
import { requireNexusTaskOwner } from '@/services/nexusTaskAuthorization';
import { notify } from './notify';

describe('tg-notify', () => {
  test('sends plain text without parse options', async () => {
    const sendMessage = jest
      .fn<(chatId: number, text: string, extra?: unknown) => Promise<any>>()
      .mockResolvedValue({ message_id: 42 });
    const bot = { telegram: { sendMessage } } as any;

    await expect(notify.exec({ chatId: -123, text: '`plain_text`' }, bot)).resolves.toEqual({
      messageId: 42,
      isSent: true,
      messageIds: [42],
    });
    expect(sendMessage).toHaveBeenCalledWith(-123, '`plain_text`', {});
  });

  test('returns a delivery error instead of throwing', async () => {
    const bot = {
      telegram: {
        sendMessage: jest
          .fn<(chatId: number, text: string, extra?: unknown) => Promise<any>>()
          .mockRejectedValue(new Error('Telegram unavailable')),
      },
    } as any;

    await expect(notify.exec({ chatId: 123, text: 'alert' }, bot)).resolves.toEqual({
      messageId: null,
      isSent: false,
      error: 'Telegram unavailable',
    });
  });
});

test('rechecks authorization in the sending process before exposing task content', async () => {
  jest.mocked(requireNexusTaskOwner).mockRejectedValueOnce(new Error('Forbidden'));
  const bot = { telegram: { sendMessage: jest.fn() } };
  const result = await notify.exec(
    { chatId: 123, text: 'private task content', nexusNotificationId: 'event' },
    bot as never,
  );
  expect(result.isSent).toBe(false);
  expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
});
test('rejects a task notification belonging to another owner', async () => {
  jest.mocked(NexusTaskNotification.findOne).mockResolvedValueOnce(null);
  const bot = { telegram: { sendMessage: jest.fn() } };
  const result = await notify.exec(
    { chatId: 123, text: 'private task content', nexusNotificationId: 'foreign-event' },
    bot as never,
  );
  expect(result.isSent).toBe(false);
  expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
});
