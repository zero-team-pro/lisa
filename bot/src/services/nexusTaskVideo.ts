import { createHash, timingSafeEqual } from 'node:crypto';
import { NexusTask, sequelize } from '@/models';
import { isAuthorizedTaskCreator, requireNexusTaskOwner, NexusTaskForbiddenError } from './nexusTaskAuthorization';
import { NexusTaskConflictError, NexusTaskNotFoundError, NexusTaskValidationError } from './nexusTasks';
import { validateOperation } from './nexusTaskRouting';
import type { TelegrafBot } from '@/types';

export const SEND_VIDEO_MAX_BYTES = 49_000_000;
export interface VideoLease {
  ownerChatId: string;
  taskId: string;
  leaseToken: string;
  attempt: number;
}

// Used at both gateway intake and the actual Telegram send boundary.
export async function requireVideoTask(input: VideoLease, transaction?: any) {
  const admin = await requireNexusTaskOwner(input.ownerChatId);
  const task = await NexusTask.findOne({
    where: { id: input.taskId, ownerChatId: input.ownerChatId },
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!task) throw new NexusTaskNotFoundError('Task not found');
  if (!isAuthorizedTaskCreator(task.createdBy, input.ownerChatId, admin.id)) throw new NexusTaskForbiddenError();
  if (validateOperation(task.operation)?.kind !== 'tiktok.send' || !task.interaction?.sourceMessageId)
    throw new NexusTaskValidationError('Video delivery requires a send task with an original message');
  const hash = createHash('sha256').update(input.leaseToken).digest('hex');
  if (
    task.status !== 'leased' ||
    task.attemptCount !== input.attempt ||
    !task.leaseExpiresAt ||
    task.leaseExpiresAt.getTime() <= Date.now() ||
    !task.leaseTokenHash ||
    task.leaseTokenHash.length !== hash.length ||
    !timingSafeEqual(Buffer.from(task.leaseTokenHash), Buffer.from(hash))
  )
    throw new NexusTaskConflictError('Inactive video lease');
  return task;
}

export async function deliverNexusVideo(input: VideoLease & { video: string }, bot: TelegrafBot) {
  const video = Buffer.from(input.video, 'base64');
  if (!video.length || video.length > SEND_VIDEO_MAX_BYTES || video.subarray(4, 8).toString() !== 'ftyp')
    throw new NexusTaskValidationError('Expected a bounded MP4 video');
  const reserved = await sequelize.transaction(async (transaction) => {
    const task = await requireVideoTask(input, transaction);
    if (task.capture?.state === 'sent') return { state: 'sent' as const, reply: 0 };
    if (task.capture?.state === 'sending') return { state: 'sending' as const, reply: 0 };
    // Commit before external delivery. An interrupted/uncertain send must never resend automatically.
    task.capture = { libraryId: null, state: 'sending', reasonCode: null };
    await task.save({ transaction });
    return { state: 'reserved' as const, reply: task.interaction.sourceMessageId };
  });
  if (reserved.state !== 'reserved') return { state: reserved.state };
  await bot.telegram.sendVideo(
    input.ownerChatId,
    { source: video, filename: 'video.mp4' },
    {
      supports_streaming: true,
      reply_parameters: { message_id: reserved.reply },
    },
  );
  await NexusTask.update(
    { capture: { libraryId: null, state: 'sent', reasonCode: null } },
    {
      where: { id: input.taskId, ownerChatId: input.ownerChatId, 'capture.state': 'sending' },
    },
  );
  return { state: 'sent' };
}
