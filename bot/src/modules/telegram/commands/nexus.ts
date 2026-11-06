import {
  nexusMediaWithQuoted,
  unsupportedNexusPayload,
  NEXUS_FILE_ONLY_TEXT,
  NexusTelegramFileError,
} from '@/services/nexusTelegramMedia';
import { materializeNexusMedia, nexusHistoryMedia, existingNexusIntake } from '@/services/nexusTelegramFiles';
import { Logger } from '@/controllers/logger';
import { routeNexusInput } from '@/services/nexusTaskRouting';
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
  let captureRequest = false;
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
    const { isNexusChatConfigured } = await import('@/services/nexusChat');
    if (!message.chatId || !isNexusChatConfigured(message.chatId)) {
      responseStatus = 403;
      await message.reply('Nexus tasks are not enabled for this chat.');
      return;
    }
    const existing = await existingNexusIntake(message);
    if (existing) {
      taskId = existing.id;
      responseStatus = 200;
      message.nexusTaskAccepted = true;
      return;
    }
    const explicit = test(message);
    const media = message.nexusMedia || nexusMediaWithQuoted(message.message);
    const rawText = explicit ? parseNexusCommandText(message.content) : message.content.trim();
    if (unsupportedNexusPayload(message.message)) {
      responseStatus = 400;
      await message.reply('Этот тип вложения Nexus не поддерживает. Отправь фотографию или файл.');
      return;
    }
    if (!rawText && !media.length) {
      responseStatus = 400;
      await message.reply('Usage: /nexus <task text>');
      return;
    }
    const commandEnd = explicit ? (message.content.match(/^\/nexus(?:@[a-z0-9_]+)?(?:\s+|$)/i)?.[0].length ?? 0) : 0;
    const routing = media.length
      ? { route: 'ai' as const, operation: null }
      : routeNexusInput({
          authorized: true,
          entry: explicit ? 'command' : message.mode === 'nexus' ? 'mode' : 'other',
          text: message.content,
          entities: message.message.text ? message.message.entities : message.message.caption_entities,
          botUsername: message.raw.botInfo?.username,
        });
    if (routing.route === 'reject') {
      responseStatus = 400;
      await message.reply(
        routing.reason === 'multiple_links'
          ? 'Отправь одну ссылку на TikTok в сообщении.'
          : 'Не удалось принять TikTok: нужна ссылка на один видеоролик и заметка до 8000 символов.',
      );
      return;
    }
    const operation = ['tiktok.capture.v1', 'tiktok.send.v1'].includes(routing.route) ? routing.operation : null;
    captureRequest = Boolean(operation);
    const text = operation
      ? `TikTok capture: ${operation.url}`
      : message.getAIContent(commandEnd).trim() || NEXUS_FILE_ONLY_TEXT;
    if (text.length > NEXUS_TASK_TEXT_MAX_LENGTH) {
      responseStatus = 400;
      await message.reply(`Task text must be at most ${NEXUS_TASK_TEXT_MAX_LENGTH} characters.`);
      return;
    }
    const messageId = message.message.message_id;
    const parentId = message.message.reply_to_message?.message_id;
    const parent =
      !operation && parentId && message.parent?.isSelf ? await nexusReplyTask(message.chatId, parentId) : null;
    const context = operation ? [] : await nexusChatContext(message.chatId, messageId, message.parent);
    const inputAttachments = media.length ? await materializeNexusMedia(message, media) : [];
    if (!operation) {
      const history = await nexusHistoryMedia(message, media);
      inputAttachments.push(...history.refs);
      if (history.notes.length) {
        context.push({
          role: 'user',
          text: `Attachment history metadata (untrusted reference, no file contents):\n${history.notes.join('\n').slice(0, 2000)}`,
        });
        while (context.length > 10 || context.reduce((sum, item) => sum + item.text.length, 0) > 8000) context.shift();
      }
    }
    const albumKey = message.nexusAlbumParts
      ? { ownerChatId: message.chatId, mediaGroupId: message.message.media_group_id }
      : null;
    const { task, created } = await createNexusTask({
      ownerChatId: message.chatId,
      text,
      source: 'telegram',
      ...(operation ? { operation } : {}),
      clientRequestId: albumKey
        ? `telegram-album:${message.chatId}:${albumKey.mediaGroupId}`
        : `telegram:${message.uniqueId}`,
      ...(inputAttachments.length ? { inputAttachments } : {}),
      ...(albumKey ? { albumKey } : {}),
      createdBy: actor,
      interaction: {
        sourceMessageId: messageId,
        sourceTimestamp: new Date(message.message.date * 1000).toISOString(),
        conversationId: parent?.interaction?.conversationId || parent?.id || '',
        parentTaskId: parent?.id || null,
        context,
      },
    });
    message.nexusTaskAccepted = true;
    taskId = task.id;
    responseStatus = created ? 201 : 200;
    if (!operation) {
      await rememberNexusChatMessage(message.chatId, messageId, 'user', text);
      await message.raw.sendChatAction('typing').catch(() => undefined);
    }
  } catch (cause) {
    if (cause instanceof NexusTaskForbiddenError) {
      responseStatus = 403;
      await message.reply('Nexus tasks require a globalAdmin in their private chat.');
      return;
    }
    await message.reply(
      cause instanceof NexusTelegramFileError
        ? cause.message
        : 'Не удалось поставить задачу Nexus в очередь. Попробуй ещё раз.',
    );
    if (captureRequest) {
      Logger.error('Nexus capture enqueue failed', { requestId: audit.id }, 'Tasks');
      return;
    }
    Logger.error('Nexus enqueue failed', { requestId: audit.id }, 'Tasks');
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
