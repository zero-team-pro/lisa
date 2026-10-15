import { NexusTaskNotification, sequelize } from '@/models';
import { requireNexusTaskOwner } from '@/services/nexusTaskAuthorization';
import { rememberNexusChatMessage } from '@/services/nexusChat';
import { markdownMessage, textMessage } from '@/messages/document';
import { sendTelegram } from '@/messages/telegram';
import { TelegrafBot } from '@/types';

interface NotifyParams {
  chatId: number;
  text: string;
  format?: 'markdown';
  replyToMessageId?: number;
  nexusNotificationId?: string;
}

interface NotifyResult {
  messageId: number | null;
  isSent: boolean;
  messageIds?: number[];
  error?: string;
}

const methodName = 'tg-notify';

const exec = async (params: NotifyParams, bot: TelegrafBot): Promise<NotifyResult> => {
  try {
    const messages = await sendTelegram(
      params.format === 'markdown' ? markdownMessage(params.text) : textMessage(params.text),
      async ({ text, entities }) => {
        if (params.nexusNotificationId) {
          await requireNexusTaskOwner(String(params.chatId));
          const notification = await NexusTaskNotification.findOne({
            where: { id: params.nexusNotificationId, ownerChatId: String(params.chatId) },
          });
          if (!notification) throw new Error('Task notification owner mismatch');
        }
        const extra = {
          ...(entities.length ? { entities } : {}),
          ...(params.replyToMessageId
            ? { reply_parameters: { message_id: params.replyToMessageId, allow_sending_without_reply: true } }
            : {}),
        };
        const sent = await bot.telegram.sendMessage(params.chatId, text, extra);
        if (params.nexusNotificationId) {
          // Persist each chunk before acknowledging delivery. Retain IDs from
          // earlier delivery attempts too, so replies never attach to a new task.
          await NexusTaskNotification.update(
            { messageIds: sequelize.fn('array_append', sequelize.col('messageIds'), sent.message_id) },
            { where: { id: params.nexusNotificationId, ownerChatId: String(params.chatId) } },
          );
        }
        await rememberNexusChatMessage(String(params.chatId), sent.message_id, 'assistant', text);
        return sent;
      },
    );
    const message = messages[0];

    if (typeof message?.message_id === 'number') {
      return { messageId: message.message_id, messageIds: messages.map((message) => message.message_id), isSent: true };
    }

    return { messageId: null, isSent: false, error: 'Telegram returned no message id' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { messageId: null, isSent: false, error: detail };
  }
};

export const notify = { methodName, exec };
