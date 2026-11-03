import { createHash } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import type { TelegramMessage } from '@/controllers/telegram/telegramMessage';
import { sequelize, NexusTask } from '@/models';
import { requireNexusTelegram } from './nexusChat';
import { stageNexusFile, NEXUS_FILE_LIMITS } from './nexusFiles';
import { extractNexusMedia, NexusTelegramFileError, type NexusTelegramMedia } from './nexusTelegramMedia';

export const rememberNexusMedia = async (message: TelegramMessage) => {
  const descriptors = (message.nexusAlbumParts || [message.message]).flatMap((part) => extractNexusMedia(part));
  if (!descriptors.length) return;
  try {
    await requireNexusTelegram(message);
    for (const [ordinal, descriptor] of descriptors.entries())
      await sequelize.query(
        `INSERT INTO nexus_chat_file ("ownerChatId", "messageId", ordinal, descriptor, "createdAt") VALUES (:ownerChatId, :messageId, :ordinal, CAST(:descriptor AS jsonb), now()) ON CONFLICT ("ownerChatId", "messageId", ordinal) DO NOTHING`,
        {
          replacements: {
            ownerChatId: message.chatId,
            messageId: descriptor.sourceMessageId,
            ordinal,
            descriptor: JSON.stringify(descriptor),
          },
        },
      );
  } catch {
    /* metadata history is best effort; required task files never are */
  }
};

export const materializeNexusMedia = async (message: TelegramMessage, descriptors: NexusTelegramMedia[]) => {
  await requireNexusTelegram(message);
  if (descriptors.length > NEXUS_FILE_LIMITS.count) throw new NexusTelegramFileError('count');
  if (descriptors.some((file) => file.sizeBytes !== null && file.sizeBytes > NEXUS_FILE_LIMITS.bytes))
    throw new NexusTelegramFileError('file_size');
  if (descriptors.reduce((sum, file) => sum + (file.sizeBytes || 0), 0) > NEXUS_FILE_LIMITS.total)
    throw new NexusTelegramFileError('total_size');
  const refs: Array<{ id: string; provenance: NexusTelegramMedia['provenance']; sourceMessageId: number }> = [];
  const signal = AbortSignal.timeout(NEXUS_FILE_LIMITS.stagingMs);
  let total = 0;
  // Sequential downloads stay below the permitted concurrency of two and
  // enforce the aggregate actual-byte budget, including false Telegram sizes.
  for (const descriptor of descriptors) {
    let fileLimitError: NexusTelegramFileError | undefined;
    const transferSignal = AbortSignal.any([signal, AbortSignal.timeout(NEXUS_FILE_LIMITS.timeoutMs)]);
    try {
      const url = await message.raw.telegram.getFileLink(descriptor.fileId);
      const response = await fetch(url, {
        redirect: 'error',
        signal: transferSignal,
      });
      if (!response.ok || !response.body) throw new Error('Unavailable');
      let size = 0;
      async function* bounded() {
        for await (const chunk of response.body as any as AsyncIterable<Uint8Array>) {
          size += chunk.byteLength;
          total += chunk.byteLength;
          if (size > NEXUS_FILE_LIMITS.bytes) {
            fileLimitError = new NexusTelegramFileError('file_size');
            throw fileLimitError;
          }
          if (total > NEXUS_FILE_LIMITS.total) {
            fileLimitError = new NexusTelegramFileError('total_size');
            throw fileLimitError;
          }
          yield chunk;
        }
      }
      const sourceHash = createHash('sha256')
        .update(JSON.stringify([message.chatId, descriptor.sourceMessageId, descriptor.uniqueId]))
        .digest('hex');
      const fileId = `${sourceHash.slice(0, 8)}-${sourceHash.slice(8, 12)}-${sourceHash.slice(12, 16)}-${sourceHash.slice(16, 20)}-${sourceHash.slice(20, 32)}`;
      const file = await stageNexusFile(
        {
          ownerChatId: message.chatId,
          fileId,
          name: descriptor.name,
          declaredMime: descriptor.mimeType,
          source: 'telegram',
          telegramFileId: descriptor.fileId,
          telegramUniqueId: descriptor.uniqueId,
        },
        bounded(),
      );
      refs.push({ id: file.id, provenance: descriptor.provenance, sourceMessageId: descriptor.sourceMessageId });
      await sequelize.query(
        `INSERT INTO nexus_chat_file ("ownerChatId", "messageId", ordinal, "fileId", descriptor, "createdAt") VALUES (:ownerChatId, :messageId, 0, :fileId, CAST(:descriptor AS jsonb), now()) ON CONFLICT ("ownerChatId", "messageId", ordinal) DO UPDATE SET "fileId"=EXCLUDED."fileId"`,
        {
          replacements: {
            ownerChatId: message.chatId,
            messageId: descriptor.sourceMessageId,
            fileId: file.id,
            descriptor: JSON.stringify(descriptor),
          },
        },
      );
    } catch (cause) {
      // A fetch/getFileLink error can contain the bot token. Only fixed messages escape.
      if (fileLimitError) throw fileLimitError;
      if (transferSignal.aborted) throw new NexusTelegramFileError('timeout');
      if (cause instanceof NexusTelegramFileError) throw cause;
      const status = (cause as { status?: number })?.status;
      throw new NexusTelegramFileError(
        status === 413
          ? 'file_size'
          : status === 410
            ? 'expired'
            : status === 400
              ? 'unreadable'
              : status === 503 || status === 507
                ? 'storage'
                : (cause as { name?: string })?.name === 'TimeoutError'
                  ? 'timeout'
                  : 'unavailable',
      );
    }
  }
  return refs;
};

export const nexusHistoryMedia = async (message: TelegramMessage, direct: NexusTelegramMedia[]) => {
  await requireNexusTelegram(message);
  const rows = await sequelize.query<{
    fileId: string | null;
    descriptor: NexusTelegramMedia;
    state: string | null;
    sizeBytes: string | number | null;
  }>(
    `SELECT h."fileId", h.descriptor, f.state, f."sizeBytes" FROM nexus_chat_file h LEFT JOIN nexus_file f ON f.id=h."fileId" AND f."ownerChatId"=h."ownerChatId" WHERE h."ownerChatId"=:ownerChatId AND h."messageId" < :messageId AND h."createdAt">now()-interval '24 hours' ORDER BY h."messageId" DESC, h.ordinal LIMIT 30`,
    { replacements: { ownerChatId: message.chatId, messageId: message.message.message_id }, type: QueryTypes.SELECT },
  );
  const refs: Array<{
    id: string;
    provenance: 'history';
    sourceMessageId: number;
    availability?: 'ready' | 'expired' | 'metadata-only';
  }> = [];
  const notes: string[] = [];
  const seen = new Set(direct.map((item) => `${item.sourceMessageId}:${item.uniqueId}`));
  let bytes = 0;
  for (const row of rows) {
    const descriptor = row.descriptor;
    if (!descriptor || seen.has(`${descriptor.sourceMessageId}:${descriptor.uniqueId}`)) continue;
    seen.add(`${descriptor.sourceMessageId}:${descriptor.uniqueId}`);
    const size = Number(row.sizeBytes ?? descriptor.sizeBytes ?? NEXUS_FILE_LIMITS.bytes + 1);
    const eligible =
      refs.length < NEXUS_FILE_LIMITS.count &&
      size <= NEXUS_FILE_LIMITS.bytes &&
      bytes + size <= NEXUS_FILE_LIMITS.total;
    if (!eligible) {
      notes.push(
        `${descriptor.name} (message ${descriptor.sourceMessageId}): metadata-only, outside history file bounds.`,
      );
      continue;
    }
    if (row.fileId) {
      refs.push({
        id: row.fileId,
        provenance: 'history',
        sourceMessageId: descriptor.sourceMessageId,
        ...(row.state !== 'ready' ? { availability: 'expired' } : {}),
      });
      if (row.state === 'ready') bytes += size;
      continue;
    }
    try {
      const [file] = await materializeNexusMedia(message, [{ ...descriptor, provenance: 'history' }]);
      refs.push({ ...file, provenance: 'history' });
      bytes += size;
    } catch {
      notes.push(
        `${descriptor.name} (message ${descriptor.sourceMessageId}): metadata-only; original bytes are unavailable.`,
      );
    }
  }
  return { refs, notes };
};

export const existingNexusIntake = async (message: TelegramMessage) => {
  await requireNexusTelegram(message);
  const clientRequestId = message.nexusAlbumParts
    ? `telegram-album:${message.chatId}:${message.message.media_group_id}`
    : `telegram:${message.uniqueId}`;
  return NexusTask.findOne({ where: { ownerChatId: message.chatId, clientRequestId } });
};
