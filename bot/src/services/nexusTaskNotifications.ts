import { Op, Transaction } from 'sequelize';

import type { Bridge } from '@/controllers/bridge';
import { Logger } from '@/controllers/logger';
import { NexusTaskNotification, sequelize } from '@/models';
import type { NexusTask } from '@/models';
import type { NexusTaskExecution } from '@/models/nexusTaskAttempt';
import { requireNexusTaskOwner } from './nexusTaskAuthorization';
import { uuid } from '@/utils/uuid';
import { bridgeRequest } from '@/utils/bridgeRequest';

interface NotifyBridgeResult {
  messageId: number | null;
  isSent: boolean;
  error?: string;
}

const TELEGRAM_SAFE_TEXT_LENGTH = 4000;

const truncate = (value: string, limit: number): string => {
  if (value.length <= limit) return value;
  let end = limit - 1;
  // Avoid cutting a UTF-16 surrogate pair (for example, an emoji) in half.
  if (/[\uD800-\uDBFF]/.test(value[end - 1])) end -= 1;
  return `${value.slice(0, end)}…`;
};

export const formatNexusTaskNotification = (
  task: NexusTask,
  accepted = false,
  execution: NexusTaskExecution | null = null,
): string => {
  const heading = accepted
    ? 'Nexus task accepted'
    : task.status === 'completed'
      ? 'Nexus task completed'
      : task.status === 'queued'
        ? 'Nexus task retry scheduled'
        : 'Nexus task failed';
  const lines = [heading, `ID: ${task.id}`];

  if (task.status === 'completed' && task.resultSummary) {
    lines.push('', task.resultSummary);
  } else if (task.status === 'queued' && task.availableAt) {
    lines.push(`Available at: ${task.availableAt.toISOString()}`);
    if (task.lastError) {
      lines.push('', `Error: ${task.lastError}`);
    }
  } else if (task.status === 'failed' && task.lastError) {
    lines.push('', `Error: ${task.lastError}`);
  }

  const details: string[] = [];
  if (execution) {
    if (execution.model)
      details.push(`Model: ${execution.model}${execution.reasoningEffort ? ` (${execution.reasoningEffort})` : ''}`);
    details.push(
      `Tokens: input ${execution.inputTokens ?? 'unknown'}, cached ${execution.cachedInputTokens ?? 'unknown'}, output ${execution.outputTokens ?? 'unknown'}`,
    );
    if (execution.durationMs !== null) details.push(`Duration: ${(execution.durationMs / 1000).toFixed(1)}s`);
    if (execution.reusedFromAttempt !== null)
      details.push(`Reused execution from attempt ${execution.reusedFromAttempt}`);
  }
  const footer = details.length ? `\n\n${details.join('\n')}` : '';
  return truncate(lines.join('\n'), TELEGRAM_SAFE_TEXT_LENGTH - footer.length) + footer;
};

// The event snapshot and state change commit together. Each retry/terminal event
// has its own delivery state, independent of later execution attempts.
export const enqueueNexusTaskNotification = (
  task: NexusTask,
  transaction: Transaction,
  accepted = false,
  execution: NexusTaskExecution | null = null,
) =>
  NexusTaskNotification.create(
    {
      id: uuid(),
      taskId: task.id,
      ownerChatId: task.ownerChatId,
      text: formatNexusTaskNotification(task, accepted, execution),
    },
    { transaction },
  );

export const deliverNexusTaskNotification = async (
  bridge: Bridge,
  notification: NexusTaskNotification,
): Promise<boolean> => {
  if (!bridge.isConnected()) return false;
  try {
    await requireNexusTaskOwner(notification.ownerChatId);
    const result = await bridgeRequest<NotifyBridgeResult>(bridge, 'telegram', 'tg-notify', {
      chatId: Number(notification.ownerChatId),
      text: notification.text,
      format: 'markdown',
    });
    if (result?.isSent && typeof result.messageId === 'number') return true;
    Logger.error('Nexus task Telegram delivery failed', { taskId: notification.taskId }, 'Tasks');
  } catch {
    Logger.error('Nexus task Telegram delivery failed', { taskId: notification.taskId }, 'Tasks');
  }
  return false;
};

export const flushNexusTaskNotifications = async (bridge: Bridge) => {
  for (let index = 0; index < 20; index += 1) {
    if (!bridge.isConnected()) return;
    const now = new Date();
    const notification = await sequelize.transaction(async (transaction) => {
      const pending = await NexusTaskNotification.findOne({
        where: {
          deliveredAt: null,
          [Op.or]: [{ claimedUntil: null }, { claimedUntil: { [Op.lte]: now } }],
        },
        order: [
          ['createdAt', 'ASC'],
          ['id', 'ASC'],
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
      });
      if (!pending) return null;
      pending.claimedUntil = new Date(now.getTime() + 300_000);
      await pending.save({ transaction });
      return pending;
    });
    if (!notification) return;
    const delivered = await deliverNexusTaskNotification(bridge, notification);
    await NexusTaskNotification.update(
      delivered ? { deliveredAt: new Date(), claimedUntil: null } : { claimedUntil: new Date(Date.now() + 60_000) },
      { where: { id: notification.id, claimedUntil: notification.claimedUntil, deliveredAt: null } },
    );
  }
};
