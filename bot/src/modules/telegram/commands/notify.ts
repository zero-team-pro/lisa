import { TelegrafBot } from '@/types';

interface NotifyParams {
  chatId: number;
  text: string;
}

interface NotifyResult {
  messageId: number | null;
  isSent: boolean;
  error?: string;
}

const methodName = 'tg-notify';

const exec = async (params: NotifyParams, bot: TelegrafBot): Promise<NotifyResult> => {
  try {
    const message = await bot.telegram.sendMessage(params.chatId, params.text);

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
