import { markdownMessage, textMessage } from '@/messages/document';
import { sendTelegram } from '@/messages/telegram';
import { TelegrafBot } from '@/types';

interface NotifyParams {
  chatId: number;
  text: string;
  format?: 'markdown';
}

interface NotifyResult {
  messageId: number | null;
  isSent: boolean;
  error?: string;
}

const methodName = 'tg-notify';

const exec = async (params: NotifyParams, bot: TelegrafBot): Promise<NotifyResult> => {
  try {
    const messages = await sendTelegram(
      params.format === 'markdown' ? markdownMessage(params.text) : textMessage(params.text),
      ({ text, entities }) =>
        entities.length
          ? bot.telegram.sendMessage(params.chatId, text, { entities })
          : bot.telegram.sendMessage(params.chatId, text),
    );
    const message = messages[0];

    if (typeof message?.message_id === 'number') {
      return { messageId: message.message_id, isSent: true };
    }

    return { messageId: null, isSent: false, error: 'Telegram returned no message id' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { messageId: null, isSent: false, error: detail };
  }
};

export const notify = { methodName, exec };
