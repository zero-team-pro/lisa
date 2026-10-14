import { NexusTaskForbiddenError } from '@/services/nexusTaskAuthorization';
import { beginTaskRequest, finishTaskRequest } from '@/services/nexusTaskAudit';
import { parseNotifyTokens } from '@/auth/notifyToken';
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
    const rawText = parseNexusCommandText(message.content);
    if (!rawText) {
      responseStatus = 400;
      await message.reply('Usage: /nexus <task text>');
      return;
    }
    const commandEnd = message.content.match(/^\/nexus(?:@[a-z0-9_]+)?\s+/i)?.[0].length ?? 0;
    const text = message.getAIContent(commandEnd).trim();
    if (text.length > NEXUS_TASK_TEXT_MAX_LENGTH) {
      responseStatus = 400;
      await message.reply(`Task text must be at most ${NEXUS_TASK_TEXT_MAX_LENGTH} characters.`);
      return;
    }
    if (
      !message.chatId ||
      ![...parseNotifyTokens(process.env.NOTIFY_TOKENS).values()].some((id) => String(id) === message.chatId)
    ) {
      responseStatus = 403;
      await message.reply('Nexus tasks are not enabled for this chat.');
      return;
    }
    const { task, created } = await createNexusTask({
      ownerChatId: message.chatId,
      text,
      source: 'telegram',
      clientRequestId: `telegram:${message.uniqueId}`,
      createdBy: actor,
    });
    taskId = task.id;
    responseStatus = created ? 201 : 200;
    await message.reply(`${created ? 'Nexus task accepted' : 'Nexus task already accepted'}\nID: ${task.id}`);
  } catch (cause) {
    if (cause instanceof NexusTaskForbiddenError) {
      responseStatus = 403;
      await message.reply('Nexus tasks require a globalAdmin in their private chat.');
      return;
    }
    throw cause;
  } finally {
    await finishTaskRequest(audit.id, responseStatus, taskId);
  }
};

export const nexus = { methodName, test, exec };
