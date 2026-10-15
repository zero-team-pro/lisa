import { Op } from 'sequelize';
import { NexusChatMessage, NexusTask, NexusTaskNotification } from '@/models';
import { parseNotifyTokens } from '@/auth/notifyToken';
import { requireNexusTaskOwner, NexusTaskForbiddenError } from './nexusTaskAuthorization';
import { uuid } from '@/utils/uuid';
import { Logger } from '@/controllers/logger';

const sliceContextText = (text: string, limit: number) => {
  let end = Math.min(text.length, limit);
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end -= 1;
  return text.slice(0, end);
};

export const isNexusChatConfigured = (chatId: string) =>
  [...parseNotifyTokens(process.env.NOTIFY_TOKENS).values()].some((id) => String(id) === chatId);
export const requireNexusTelegram = async (message: {
  chatId: string;
  fromId: string;
  isGroup: boolean;
  raw?: { message?: { sender_chat?: unknown } };
}) => {
  if (
    message.chatId !== message.fromId ||
    message.isGroup ||
    message.raw?.message?.sender_chat ||
    !isNexusChatConfigured(message.chatId)
  )
    throw new NexusTaskForbiddenError('A configured globalAdmin private chat is required');
  return requireNexusTaskOwner(message.chatId);
};

// Only authorized private chats are retained. Commands (including link tokens)
// never enter history. Task snapshots are separate from this bounded buffer.
export const rememberNexusChatMessage = async (
  ownerChatId: string,
  messageId: number,
  role: 'user' | 'assistant',
  text: string,
) => {
  if (!text?.trim() || text.trimStart().startsWith('/') || !isNexusChatConfigured(ownerChatId)) return;
  try {
    await requireNexusTaskOwner(ownerChatId);
    await NexusChatMessage.findOrCreate({
      where: { ownerChatId, messageId },
      defaults: { id: uuid(), ownerChatId, messageId, role, text: sliceContextText(text, 8000) },
    });
    const recent = await NexusChatMessage.findAll({
      where: { ownerChatId },
      order: [['messageId', 'DESC']],
      attributes: ['messageId'],
      limit: 50,
    });
    await NexusChatMessage.destroy({
      where: {
        ownerChatId,
        [Op.or]: [
          { createdAt: { [Op.lt]: new Date(Date.now() - 86400000) } },
          ...(recent.length ? [{ messageId: { [Op.lt]: Math.min(...recent.map((item) => item.messageId)) } }] : []),
        ],
      },
    });
  } catch (error) {
    if (!(error instanceof NexusTaskForbiddenError)) Logger.warn('Nexus chat history unavailable', {}, 'Tasks');
  }
};

export const boundNexusContext = (messages: Array<{ role: 'user' | 'assistant'; text: string }>) => {
  let remaining = 8000;
  const result: Array<{ role: 'user' | 'assistant'; text: string }> = [];
  for (const message of messages.slice(-10).reverse()) {
    if (remaining <= 0) break;
    const text = sliceContextText(message.text, remaining);
    remaining -= text.length;
    result.unshift({ role: message.role, text });
  }
  return result;
};

export const nexusChatContext = async (
  ownerChatId: string,
  beforeMessageId: number,
  quoted?: { content: string; isSelf: boolean },
) => {
  await requireNexusTaskOwner(ownerChatId);
  const recent = await NexusChatMessage.findAll({
    where: {
      ownerChatId,
      messageId: { [Op.lt]: beforeMessageId },
      createdAt: { [Op.gte]: new Date(Date.now() - 86400000) },
    },
    order: [['messageId', 'DESC']],
    limit: 10,
  });
  const messages = recent.reverse().map((item) => ({ role: item.role, text: item.text }));
  if (quoted?.content && !messages.some((item) => item.text === quoted.content))
    messages.push({ role: quoted.isSelf ? 'assistant' : 'user', text: quoted.content });
  return boundNexusContext(messages);
};

export const nexusReplyTask = async (ownerChatId: string, replyMessageId: number) => {
  await requireNexusTaskOwner(ownerChatId);
  const notification = await NexusTaskNotification.findOne({
    where: { ownerChatId, messageIds: { [Op.contains]: [replyMessageId] } },
  });
  if (!notification) return null;
  return NexusTask.findOne({ where: { id: notification.taskId, ownerChatId, status: 'completed' } });
};

export const pruneNexusChatHistory = () =>
  NexusChatMessage.destroy({ where: { createdAt: { [Op.lt]: new Date(Date.now() - 86400000) } } });
