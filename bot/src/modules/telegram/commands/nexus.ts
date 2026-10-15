import { NexusTaskForbiddenError } from '@/services/nexusTaskAuthorization';
import { beginTaskRequest, finishTaskRequest } from '@/services/nexusTaskAudit';
import { nexusChatContext, nexusReplyTask, rememberNexusChatMessage } from '@/services/nexusChat';
import type { TelegramMessage } from '@/controllers/telegram/telegramMessage';
import { createNexusTask, NEXUS_TASK_TEXT_MAX_LENGTH } from '@/services/nexusTasks';

export const parseNexusCommandText = (content: string): string | null => {
  const match = content.match(/^\/nexus(?:@[a-z0-9_]+)?(?:\s+([\s\S]*))?$/i);
  const text = match?.[1]?.trim() || '';
  return text || null;
};

const methodName = 'nexus';

const test = (message: TelegramMessage): boolean => {
  const match = message.content.match(/^\/nexus(?:@([a-z0-9_]+))?(?:\s|$)/i);
  return Boolean(match && (!match[1] || match[1].toLowerCase() === message.raw.botInfo.username?.toLowerCase()));
};

const exec = async (message: TelegramMessage) => {
  message.markProcessed();
  const admin = await message.getAdmin();
  const actor = { type: 'telegram' as const, telegramUserId: message.fromId, adminUserId: admin?.id || null };
  const audit = await beginTaskRequest('create', message.chatId, actor, {
    text: message.content,
    messageId: message.uniqueId,
  });
  let responseStatus = 500;
  let taskId: string | null = null;
  try {
    if (
      !message.fromId ||
      admin?.role !== 'globalAdmin' ||
      message.isGroup ||
      message.chatId !== message.fromId ||
      message.raw?.message?.sender_chat
    ) {
      responseStatus = 403;
      await message.reply('Nexus tasks require a globalAdmin in their private chat.');
      return;
    }
    const explicit = test(message);
    const rawText = explicit ? parseNexusCommandText(message.content) : message.content.trim();
    if (!rawText) {
      responseStatus = 400;
      await message.reply('Usage: /nexus <task text>');
      return;
    }
    const commandEnd = explicit ? (message.content.match(/^\/nexus(?:@[a-z0-9_]+)?\s+/i)?.[0].length ?? 0) : 0;
    const text = message.getAIContent(commandEnd).trim();
    if (text.length > NEXUS_TASK_TEXT_MAX_LENGTH) {
      responseStatus = 400;
      await message.reply(`Task text must be at most ${NEXUS_TASK_TEXT_MAX_LENGTH} characters.`);
      return;
    }
    const { isNexusChatConfigured } = await import('@/services/nexusChat');
    if (!message.chatId || !isNexusChatConfigured(message.chatId)) {
      responseStatus = 403;
      await message.reply('Nexus tasks are not enabled for this chat.');
      return;
    }
    const messageId = message.message.message_id;
    const parentId = message.message.reply_to_message?.message_id;
    const parent = parentId && message.parent?.isSelf ? await nexusReplyTask(message.chatId, parentId) : null;
    const context = await nexusChatContext(message.chatId, messageId, message.parent);
    const { task, created } = await createNexusTask({
      ownerChatId: message.chatId,
      text,
      source: 'telegram',
      clientRequestId: `telegram:${message.uniqueId}`,
      createdBy: actor,
      interaction: {
        sourceMessageId: messageId,
        conversationId: parent?.interaction?.conversationId || parent?.id || '',
        parentTaskId: parent?.id || null,
        context,
      },
    });
    taskId = task.id;
    responseStatus = created ? 201 : 200;
    await rememberNexusChatMessage(message.chatId, messageId, 'user', text);
    await message.raw.sendChatAction('typing').catch(() => undefined);
  } catch (cause) {
    if (cause instanceof NexusTaskForbiddenError) {
      responseStatus = 403;
      await message.reply('Nexus tasks require a globalAdmin in their private chat.');
      return;
    }
    await message.reply('Не удалось поставить задачу Nexus в очередь. Попробуй ещё раз.');
    throw cause;
  } finally {
    await finishTaskRequest(audit.id, responseStatus, taskId);
  }
};

export const nexus = { methodName, test, exec };
export const nexusMode = {
  methodName: 'nexus-mode',
  test: (message: TelegramMessage) => message.mode === 'nexus' && !message.content.trimStart().startsWith('/'),
  exec,
};
export const nexusContinuation = {
  methodName: 'nexus-reply',
  test: async (message: TelegramMessage) => {
    if (!message.parent?.isSelf || message.content.trimStart().startsWith('/')) return false;
    // Authenticate before any message-to-task lookup. Unauthorized replies cannot route to Nexus.
    const { requireNexusTelegram } = await import('@/services/nexusChat');
    try {
      await requireNexusTelegram(message);
    } catch {
      return false;
    }
    return Boolean(await nexusReplyTask(message.chatId, message.message.reply_to_message.message_id));
  },
  exec,
};
