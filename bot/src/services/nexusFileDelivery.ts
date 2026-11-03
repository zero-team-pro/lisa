import { Input } from 'telegraf';
import { QueryTypes } from 'sequelize';
import { NexusTaskNotification, sequelize } from '@/models';
import { requireNexusTaskOwner } from './nexusTaskAuthorization';
import { readNexusFile } from './nexusFiles';
import { markdownMessage } from '@/messages/document';
import { normalizeMessage } from '@/messages/sources';
import { renderTelegram } from '@/messages/telegram';
import { rememberNexusChatMessage } from './nexusChat';
import type { TelegrafBot } from '@/types';
interface Delivery {
  notificationId: string;
  ordinal: number;
  fileId: string | null;
  state: 'pending' | 'sending' | 'sent' | 'uncertain';
  telegramMessageId: number | null;
}
const replacements = (notificationId: string, ordinal: number) => ({ notificationId, ordinal });

// A sending row is intentionally not retried automatically after a crash.
// Telegram offers no idempotency key for sendDocument/sendMessage.
export const claimDeliveryState = (state: Delivery['state']): 'send' | 'skip' | 'uncertain' =>
  state === 'pending' ? 'send' : state === 'sent' ? 'skip' : 'uncertain';

const sendItem = async (
  notificationId: string,
  ownerChatId: string,
  ordinal: number,
  send: () => Promise<{ message_id: number }>,
) => {
  const row = await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `INSERT INTO nexus_file_delivery ("notificationId", ordinal, state, "updatedAt") VALUES (:notificationId, :ordinal, 'pending', now()) ON CONFLICT DO NOTHING`,
      { replacements: replacements(notificationId, ordinal), transaction },
    );
    const rows = await sequelize.query<Delivery>(
      'SELECT * FROM nexus_file_delivery WHERE "notificationId"=:notificationId AND ordinal=:ordinal FOR UPDATE',
      { replacements: replacements(notificationId, ordinal), type: QueryTypes.SELECT, transaction },
    );
    const item = rows[0];
    if (item.state === 'sending') {
      await sequelize.query(
        `UPDATE nexus_file_delivery SET state='uncertain', "updatedAt"=now() WHERE "notificationId"=:notificationId AND ordinal=:ordinal`,
        { replacements: replacements(notificationId, ordinal), transaction },
      );
      return { ...item, state: 'uncertain' as const };
    }
    if (item.state === 'uncertain') return item;
    if (item.state === 'pending')
      await sequelize.query(
        `UPDATE nexus_file_delivery SET state='sending', "updatedAt"=now() WHERE "notificationId"=:notificationId AND ordinal=:ordinal`,
        { replacements: replacements(notificationId, ordinal), transaction },
      );
    return item;
  });
  if (row.state === 'uncertain') throw new Error('Delivery is uncertain; explicit resend required');
  if (row.state === 'sent') return row.telegramMessageId;
  let sendStarted = false;
  try {
    await requireNexusTaskOwner(ownerChatId);
    sendStarted = true;
    const sent = await send();
    await sequelize.query(
      `UPDATE nexus_file_delivery SET state='sent', "telegramMessageId"=:messageId, "updatedAt"=now() WHERE "notificationId"=:notificationId AND ordinal=:ordinal`,
      { replacements: { ...replacements(notificationId, ordinal), messageId: sent.message_id } },
    );
    await NexusTaskNotification.update(
      { messageIds: sequelize.fn('array_append', sequelize.col('messageIds'), sent.message_id) },
      { where: { id: notificationId, ownerChatId } },
    );
    return sent.message_id;
  } catch (error) {
    const rejected = !sendStarted || Number.isInteger((error as any)?.response?.error_code);
    await sequelize.query(
      `UPDATE nexus_file_delivery SET state=:state, "updatedAt"=now() WHERE "notificationId"=:notificationId AND ordinal=:ordinal AND state='sending'`,
      { replacements: { ...replacements(notificationId, ordinal), state: rejected ? 'pending' : 'uncertain' } },
    );
    throw new Error(rejected ? 'Telegram rejected delivery' : 'Delivery is uncertain; explicit resend required');
  }
};

export const deliverNexusFiles = async (notificationId: string, ownerChatId: string, bot: TelegrafBot) => {
  await requireNexusTaskOwner(ownerChatId);
  const notification = await NexusTaskNotification.findOne({ where: { id: notificationId, ownerChatId } });
  if (!notification) throw new Error('Notification not found');
  const extra = notification.replyToMessageId
    ? { reply_parameters: { message_id: notification.replyToMessageId, allow_sending_without_reply: true } }
    : {};
  const messageIds: number[] = [];
  const chunks = renderTelegram(await normalizeMessage(markdownMessage(notification.text)));
  for (const [ordinal, chunk] of chunks.entries()) {
    const messageId = await sendItem(notificationId, ownerChatId, ordinal, async () => {
      let result;
      try {
        result = await bot.telegram.sendMessage(Number(ownerChatId), chunk.text, {
          ...extra,
          entities: chunk.entities,
        });
      } catch (error) {
        if (
          (error as any)?.response?.error_code !== 400 ||
          !/parse entities/i.test((error as any)?.response?.description || '')
        )
          throw error;
        result = await bot.telegram.sendMessage(Number(ownerChatId), chunk.text, extra);
      }
      await rememberNexusChatMessage(ownerChatId, result.message_id, 'assistant', chunk.text);
      return result;
    });
    if (messageId) messageIds.push(messageId);
  }
  const outputs = await sequelize.query<Delivery>(
    'SELECT * FROM nexus_file_delivery WHERE "notificationId"=:notificationId AND "fileId" IS NOT NULL ORDER BY ordinal',
    { replacements: { notificationId }, type: QueryTypes.SELECT },
  );
  for (const output of outputs) {
    if (output.state === 'sent') {
      if (output.telegramMessageId) messageIds.push(output.telegramMessageId);
      continue;
    }
    // Storage integrity failures happen before a send reservation and may be
    // retried after repair without manufacturing uncertain Telegram state.
    const { bytes, file } = await readNexusFile(ownerChatId, output.fileId);
    const messageId = await sendItem(notificationId, ownerChatId, output.ordinal, () =>
      bot.telegram.sendDocument(Number(ownerChatId), Input.fromBuffer(bytes, file.name), extra),
    );
    if (messageId) messageIds.push(messageId);
  }
  return { isSent: true, messageId: messageIds[0] || null, messageIds };
};

export const retryNexusDelivery = async (ownerChatId: string, taskId: string) => {
  await requireNexusTaskOwner(ownerChatId);
  await sequelize.transaction(async (transaction) => {
    const notifications = await NexusTaskNotification.findAll({
      where: { ownerChatId, taskId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!notifications.length) throw new Error('No task delivery found');
    if (notifications.some((item) => item.claimedUntil && item.claimedUntil.getTime() > Date.now()))
      throw new Error('Delivery is active; retry after its claim expires');
    for (const item of notifications) {
      await sequelize.query(
        `UPDATE nexus_file_delivery SET state='pending', "updatedAt"=now() WHERE "notificationId"=:notificationId AND state IN ('uncertain','sending')`,
        { replacements: { notificationId: item.id }, transaction },
      );
      await item.update({ deliveredAt: null, claimedUntil: null }, { transaction });
    }
  });
};
