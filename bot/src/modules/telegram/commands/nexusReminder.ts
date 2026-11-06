import { QueryTypes } from 'sequelize';
import { sequelize } from '@/models';
import { requireNexusTaskOwner } from '@/services/nexusTaskAuthorization';
import type { TelegrafBot } from '@/types';

export const nexusReminder = {
  methodName: 'tg-nexus-reminder',
  exec: async (params: { id: string; chatId: number; text: string }, bot: TelegrafBot) => {
    try {
      await requireNexusTaskOwner(String(params.chatId));
      const rows = await sequelize.query<{ text: string }>(
        `SELECT text FROM nexus_reminder WHERE id=:id AND "ownerChatId"=:owner AND state='sending'`,
        { replacements: { id: params.id, owner: String(params.chatId) }, type: QueryTypes.SELECT },
      );
      if (!rows.length || rows[0].text !== params.text) return { sent: false };
      await bot.telegram.sendMessage(params.chatId, params.text);
      return { sent: true };
    } catch {
      return { sent: false };
    }
  },
};
export const nexusReaction = {
  methodName: 'tg-nexus-reaction',
  exec: async (params: { chatId: number; messageId: number }, bot: TelegrafBot) => {
    try {
      await requireNexusTaskOwner(String(params.chatId));
      await (bot.telegram as any).callApi('setMessageReaction', {
        chat_id: params.chatId,
        message_id: params.messageId,
        reaction: [{ type: 'emoji', emoji: '👍' }],
      });
      return { sent: true };
    } catch {
      return { sent: false };
    }
  },
};
