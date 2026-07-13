import { describe, expect, jest, test } from '@jest/globals';
import { notify } from './notify';

describe('tg-notify', () => {
  test('sends plain text without parse options', async () => {
    const sendMessage = jest.fn<(chatId: number, text: string) => Promise<any>>().mockResolvedValue({ message_id: 42 });
    const bot = { telegram: { sendMessage } } as any;

    await expect(notify.exec({ chatId: -123, text: '`plain_text`' }, bot)).resolves.toEqual({
      messageId: 42,
      isSent: true,
    });
    expect(sendMessage).toHaveBeenCalledWith(-123, '`plain_text`');
  });

  test('returns a delivery error instead of throwing', async () => {
    const bot = {
      telegram: {
        sendMessage: jest
          .fn<(chatId: number, text: string) => Promise<any>>()
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
