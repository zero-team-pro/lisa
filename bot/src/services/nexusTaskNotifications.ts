import { QueryTypes } from 'sequelize';
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
  messageIds?: number[];
  error?: string;
}

export const compactTokens = (value: number | null | undefined): string => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value).toLowerCase();
};

const TELEGRAM_SAFE_TEXT_LENGTH = 4000;

export const safeNexusFileFailure = (error: string | null | undefined): string | null => {
  const groups: Array<[string[], string]> = [
    [
      ['Requested output file is missing; AI execution was retained and will not be repeated'],
      'AI завершил работу, но запрошенный выходной файл не создан. Результат выполнения сохранён.',
    ],
    [
      ['Generated output exceeds file size or count limits; request fewer or smaller files'],
      'Выходные файлы превышают лимит Nexus. Запроси меньше файлов или файлы меньшего размера.',
    ],
    [
      ['Unsupported attachment input: this release verifies file analysis only with Codex'],
      'Выбранный AI-провайдер пока не поддерживает проверенный анализ вложений. Для этой задачи нужен Codex.',
    ],
    [
      ['Image is unreadable, unsupported, or exceeds decode resource limits'],
      'Изображение не читается или превышает допустимые размеры. Отправь другую версию файла.',
    ],
    [['Nexus file: attachment expired'], 'Срок хранения вложения истёк. Отправь файл ещё раз.'],
    [
      ['Nexus file: required attachment unavailable', 'Nexus file: attachment is unavailable'],
      'Нужное вложение недоступно. Отправь файл ещё раз.',
    ],
    [
      [
        'Nexus file: download integrity mismatch',
        'Nexus file: content length mismatch',
        'Nexus file: download failed or integrity check rejected bytes',
      ],
      'Не удалось проверить целостность вложения. Задача не запускалась с неполным файлом. Отправь файл ещё раз.',
    ],
    [
      ['Nexus file: download exceeds byte limit', 'Nexus file: aggregate limit exceeded'],
      'Вложения превышают лимит Nexus: 20 МБ на файл и 50 МБ на задачу.',
    ],
    [['Input staging deadline exceeded'], 'Загрузка вложений прервана по времени. Отправь файлы ещё раз.'],
    [
      [
        'Generated output manifest is missing, unreadable or invalid; AI execution was retained and will not be repeated',
      ],
      'AI завершил работу, но выходные файлы не прошли проверку и не были отправлены. Результат выполнения сохранён.',
    ],
  ];
  return groups.find(([messages]) => messages.includes(error || ''))?.[1] || null;
};

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
  if (task.operation) {
    if (task.status !== 'failed') return '';
    if (task.operation.kind === 'tiktok.send')
      return task.capture?.state === 'sent' ? '' : 'Не удалось отправить видео. Попробуй отправить ссылку ещё раз.';
    return task.capture?.libraryId
      ? `Не удалось скачать видео. Ссылка сохранена в TikTok #${task.capture.libraryId}.`
      : 'Не удалось завершить сохранение TikTok. Статус ссылки в Nexus не подтверждён; проверь библиотеку или отправь ссылку ещё раз.';
  }
  const lines = [
    task.status === 'completed'
      ? task.resultSummary || 'Готово.'
      : safeNexusFileFailure(task.lastError) ||
        (task.interaction?.parentTaskId
          ? 'Не удалось продолжить сессию Nexus. Для новой независимой задачи отправь сообщение без reply на прежний результат.'
          : 'Не удалось выполнить задачу Nexus. Попробуй повторить запрос.'),
  ];

  const details: string[] = [];
  if (execution) {
    if (execution.model)
      details.push(`Model: ${execution.model}${execution.reasoningEffort ? ` (${execution.reasoningEffort})` : ''}`);
    details.push(
      `Tokens: in ${compactTokens(execution.inputTokens)} · cached ${compactTokens(execution.cachedInputTokens)} · out ${compactTokens(execution.outputTokens)}${execution.durationMs != null ? ` (${(execution.durationMs / 1000).toFixed(1)}s)` : ''}`,
    );
  }
  const footer = details.length ? `\n\n${details.join('\n')}` : '';
  return truncate(lines.join('\n'), TELEGRAM_SAFE_TEXT_LENGTH - footer.length) + footer;
};

// The event snapshot and state change commit together. Each retry/terminal event
// has its own delivery state, independent of later execution attempts.
export const enqueueNexusTaskNotification = async (
  task: NexusTask,
  transaction: Transaction,
  accepted = false,
  execution: NexusTaskExecution | null = null,
) => {
  if (task.status === 'completed') {
    const reminders = await sequelize.query(
      'SELECT id FROM nexus_reminder WHERE "taskId"=:taskId AND "ownerChatId"=:ownerChatId',
      { replacements: { taskId: task.id, ownerChatId: task.ownerChatId }, type: QueryTypes.SELECT, transaction },
    );
    if (reminders.length) return null;
  }
  if (accepted || task.status === 'queued' || (task.operation && task.status !== 'failed'))
    return Promise.resolve(null);
  const text = formatNexusTaskNotification(task, accepted, execution);
  if (!text) return Promise.resolve(null);
  const notification = await NexusTaskNotification.create(
    {
      id: uuid(),
      taskId: task.id,
      ownerChatId: task.ownerChatId,
      replyToMessageId: task.interaction?.sourceMessageId || null,
      text,
    },
    { transaction },
  );
  await sequelize.query(
    `INSERT INTO nexus_file_delivery ("notificationId", "fileId", ordinal, state, "updatedAt") SELECT :notificationId, "fileId", 1000 + ordinal, 'pending', now() FROM nexus_task_file WHERE "taskId"=:taskId AND direction='output' ON CONFLICT DO NOTHING`,
    { replacements: { notificationId: notification.id, taskId: task.id }, transaction },
  );
  return notification;
};

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
      nexusNotificationId: notification.id,
      ...(notification.replyToMessageId ? { replyToMessageId: notification.replyToMessageId } : {}),
    });
    if (result?.isSent && typeof result.messageId === 'number') {
      notification.messageIds = result.messageIds || [result.messageId];
      return true;
    }
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
