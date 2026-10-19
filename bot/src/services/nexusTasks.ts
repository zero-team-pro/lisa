import {
  validateOperation,
  validateCaptureResult,
  CAPTURE_CAPABILITY,
  SEND_CAPABILITY,
  CaptureContractError,
  validateOperationCapabilities as parseCapabilities,
} from './nexusTaskRouting';
import type { NexusTaskOperation, NexusCaptureResult } from './nexusTaskRouting';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Op, Transaction, UniqueConstraintError } from 'sequelize';

import { NexusTask, NexusTaskAttempt, sequelize } from '@/models';
import type { NexusTaskExecution } from '@/models/nexusTaskAttempt';
import type { NexusTaskActor } from '@/models/nexusTaskRequest';
import type { NexusTaskInteraction, NexusTaskSource } from '@/models/nexusTask';
import { uuid } from '@/utils/uuid';

import { enqueueNexusTaskNotification } from './nexusTaskNotifications';
import { isAuthorizedTaskCreator, NexusTaskForbiddenError, requireNexusTaskOwner } from './nexusTaskAuthorization';

export const NEXUS_TASK_MAX_ATTEMPTS = 3;
export const NEXUS_TASK_LEASE_SECONDS = 2700;
export const NEXUS_TASK_TEXT_MAX_LENGTH = 10_000;
export const NEXUS_TASK_CLIENT_REQUEST_ID_MAX_LENGTH = 200;

export class NexusTaskConflictError extends Error {}
export class NexusTaskValidationError extends Error {}
export class NexusTaskNotFoundError extends Error {}

export interface CreateNexusTaskInput {
  ownerChatId: string;
  text: string;
  source: NexusTaskSource;
  clientRequestId?: string | null;
  createdBy?: NexusTaskActor;
  interaction?: NexusTaskInteraction;
  operation?: NexusTaskOperation | null;
}

export interface ClaimNexusTaskInput {
  ownerChatId: string;
  workerId: string;
  supportsConversations?: boolean;
  supportedOperations?: string[];
  now?: Date;
}

export type NexusTaskOutcome = 'completed' | 'failed' | 'retry';

export interface ReportNexusTaskResultInput {
  ownerChatId: string;
  taskId: string;
  leaseToken: string;
  outcome: NexusTaskOutcome;
  attempt: number;
  provider: string;
  summary: string | null;
  error: string | null;
  retryable: boolean;
  retryAt: Date | null;
  execution?: NexusTaskExecution | null;
  capture?: NexusCaptureResult | null;
  now?: Date;
}

export interface ClaimedNexusTask {
  task: NexusTask | null;
  leaseToken: string | null;
  exhaustedTasks: NexusTask[];
}

export interface ReportedNexusTaskResult {
  task: NexusTask;
  duplicate: boolean;
}

const hashLeaseToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const hashesMatch = (left: string | null, right: string): boolean => {
  if (!left || left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
};

const resultFingerprint = (input: ReportNexusTaskResultInput): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        leaseToken: input.leaseToken,
        outcome: input.outcome,
        attempt: input.attempt,
        provider: input.provider,
        summary: input.summary,
        error: input.error,
        retryable: input.retryable,
        retryAt: input.retryAt?.toISOString() || null,
        execution: input.execution || null,
        ...(input.capture ? { capture: input.capture } : {}),
      }),
    )
    .digest('hex');

const clearLease = (task: NexusTask) => {
  task.workerId = null;
  task.leaseTokenHash = null;
  task.leaseExpiresAt = null;
};

export const createNexusTask = async (
  input: CreateNexusTaskInput,
  now = new Date(),
): Promise<{ task: NexusTask; created: boolean }> => {
  const admin = await requireNexusTaskOwner(input.ownerChatId);
  if (
    input.createdBy?.type !== input.source ||
    !isAuthorizedTaskCreator(input.createdBy || null, input.ownerChatId, admin.id)
  ) {
    throw new NexusTaskForbiddenError('An authenticated globalAdmin creator is required');
  }
  let operation: NexusTaskOperation | null;
  try {
    operation = validateOperation(input.operation);
  } catch (error) {
    throw new NexusTaskValidationError(error.message);
  }
  if (operation && input.interaction && (input.interaction.parentTaskId || input.interaction.context?.length)) {
    throw new NexusTaskValidationError('Capture cannot inherit an AI conversation');
  }
  if (operation?.kind === 'tiktok.send' && (!input.interaction?.sourceMessageId || input.source !== 'telegram'))
    throw new NexusTaskValidationError('Send requires an original Telegram message');
  const values = {
    operation,
    id: uuid(),
    ownerChatId: input.ownerChatId,
    text: input.text,
    source: input.source,
    status: 'queued' as const,
    clientRequestId: input.clientRequestId || null,
    createdBy: input.createdBy || null,
    interaction: input.interaction || null,
    attemptCount: 0,
    maxAttempts: NEXUS_TASK_MAX_ATTEMPTS,
    availableAt: now,
  };

  try {
    return await sequelize.transaction(async (transaction) => {
      if (values.interaction?.parentTaskId) {
        const parent = await NexusTask.findOne({
          where: { id: values.interaction.parentTaskId, ownerChatId: input.ownerChatId, status: 'completed' },
          transaction,
        });
        if (!parent || parent.operation || !isAuthorizedTaskCreator(parent.createdBy, input.ownerChatId, admin.id))
          throw new NexusTaskForbiddenError('Continuation parent is unavailable');
        values.interaction.conversationId = parent.interaction?.conversationId || parent.id;
      } else if (values.interaction) values.interaction.conversationId = values.id;
      const task = await NexusTask.create(values, { transaction });
      return { task, created: true };
    });
  } catch (error) {
    if (!values.clientRequestId || !(error instanceof UniqueConstraintError)) {
      throw error;
    }

    const existing = await NexusTask.findOne({
      where: { ownerChatId: input.ownerChatId, clientRequestId: values.clientRequestId },
    });
    if (!existing) {
      throw error;
    }
    if (
      existing.text !== input.text ||
      JSON.stringify(validateOperation(existing.operation)) !== JSON.stringify(operation)
    ) {
      throw new NexusTaskConflictError('clientRequestId already exists with different text');
    }
    return { task: existing, created: false };
  }
};

const recoverExpiredLeases = async (
  ownerChatId: string | null,
  now: Date,
  transaction: Transaction,
): Promise<NexusTask[]> => {
  const expired = await NexusTask.findAll({
    where: {
      ...(ownerChatId === null ? {} : { ownerChatId }),
      status: 'leased',
      leaseExpiresAt: { [Op.lte]: now },
    },
    order: [['createdAt', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
    skipLocked: true,
  });
  const exhausted: NexusTask[] = [];

  for (const task of expired) {
    clearLease(task);
    if (task.attemptCount >= task.maxAttempts) {
      task.status = 'failed';
      task.availableAt = null;
      task.lastError = 'Lease expired after maximum attempts';
      task.completedAt = now;
      exhausted.push(task);
    } else {
      task.status = 'queued';
      task.availableAt = now;
      task.lastError = 'Lease expired before a result was reported';
    }
    await enqueueNexusTaskNotification(task, transaction);
    await task.save({ transaction });
  }

  return exhausted;
};

export const captureOperationWhere = (capabilities: string[] = []) => {
  validateOperationCapabilities(capabilities);
  const kinds = [
    ...(capabilities.includes(CAPTURE_CAPABILITY) ? ['tiktok.capture'] : []),
    ...(capabilities.includes(SEND_CAPABILITY) ? ['tiktok.send'] : []),
  ];
  return kinds.length
    ? {
        [Op.or]: [
          { operation: null },
          ...kinds.map((kind) => ({
            'operation.kind': kind,
            'operation.version': 1,
            'operation.routingVersion': 1,
          })),
        ],
      }
    : { operation: null };
};
export const validateOperationCapabilities = (value: unknown): string[] => {
  try {
    return parseCapabilities(value);
  } catch (error) {
    throw new NexusTaskValidationError(error.message);
  }
};

export const claimNexusTask = async (input: ClaimNexusTaskInput): Promise<ClaimedNexusTask> => {
  const admin = await requireNexusTaskOwner(input.ownerChatId);
  const now = input.now || new Date();
  validateOperationCapabilities(input.supportedOperations);

  return sequelize.transaction(async (transaction) => {
    const exhaustedTasks = await recoverExpiredLeases(input.ownerChatId, now, transaction);
    const task = await NexusTask.findOne({
      where: {
        ownerChatId: input.ownerChatId,
        status: 'queued',
        [Op.and]: [captureOperationWhere(input.supportedOperations)],
        availableAt: { [Op.lte]: now },
        ...(input.supportsConversations ? {} : { interaction: null }),
      },
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
      skipLocked: true,
    });

    if (!task) {
      return { task: null, leaseToken: null, exhaustedTasks };
    }

    if (
      !isAuthorizedTaskCreator(task.createdBy, input.ownerChatId, admin.id) ||
      task.attemptCount >= task.maxAttempts
    ) {
      task.status = 'failed';
      task.availableAt = null;
      task.lastError = 'Task creator is unauthorized or maximum attempts exhausted';
      task.completedAt = now;
      await enqueueNexusTaskNotification(task, transaction);
      await task.save({ transaction });
      exhaustedTasks.push(task);
      return { task: null, leaseToken: null, exhaustedTasks };
    }

    if (task.interaction?.parentTaskId) {
      const root = await NexusTask.findOne({
        where: { id: task.interaction.conversationId, ownerChatId: input.ownerChatId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!root) throw new NexusTaskForbiddenError('Conversation unavailable');
      const active = await NexusTask.findOne({
        where: {
          ownerChatId: input.ownerChatId,
          status: 'leased',
          'interaction.conversationId': task.interaction.conversationId,
        },
        transaction,
      });
      if (active) return { task: null, leaseToken: null, exhaustedTasks };
    }

    const leaseToken = randomBytes(32).toString('base64url');
    const leaseTokenHash = hashLeaseToken(leaseToken);
    const leaseExpiresAt = new Date(now.getTime() + NEXUS_TASK_LEASE_SECONDS * 1000);
    task.status = 'leased';
    task.attemptCount += 1;
    task.workerId = input.workerId;
    task.leaseTokenHash = leaseTokenHash;
    task.leaseExpiresAt = leaseExpiresAt;
    await task.save({ transaction });

    await NexusTaskAttempt.create(
      {
        taskId: task.id,
        attempt: task.attemptCount,
        workerId: input.workerId,
        leaseTokenHash,
        leaseExpiresAt,
      },
      { transaction },
    );

    return { task, leaseToken, exhaustedTasks };
  });
};

export const reportNexusTaskResult = async (input: ReportNexusTaskResultInput): Promise<ReportedNexusTaskResult> => {
  const now = input.now || new Date();
  const admin = await requireNexusTaskOwner(input.ownerChatId);
  if (input.capture) {
    try {
      input = { ...input, capture: validateCaptureResult(input.capture, input.outcome) };
    } catch (error) {
      throw new NexusTaskValidationError(error.message);
    }
  }
  const fingerprint = resultFingerprint(input);
  const leaseTokenHash = hashLeaseToken(input.leaseToken);

  return sequelize.transaction(async (transaction) => {
    const task = await NexusTask.findOne({
      where: { id: input.taskId, ownerChatId: input.ownerChatId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!task) {
      throw new NexusTaskNotFoundError('Task not found');
    }

    if (!isAuthorizedTaskCreator(task.createdBy, input.ownerChatId, admin.id)) {
      throw new NexusTaskForbiddenError('Task creator is unauthorized');
    }

    try {
      if (task.operation) {
        validateOperation(task.operation);
        validateCaptureResult(input.capture, input.outcome);
        if (task.operation.kind === 'tiktok.send') {
          if (
            input.capture.libraryId !== null ||
            (input.outcome === 'completed'
              ? input.capture.state !== 'sent' || task.capture?.state !== 'sent'
              : input.capture.state !== 'none')
          )
            throw new CaptureContractError('Send result requires confirmed video delivery and no library ID');
        } else if (input.capture.state === 'sent')
          throw new CaptureContractError('Capture cannot report video delivery');
        if (input.provider !== 'local' || input.execution)
          throw new CaptureContractError('Capture requires local provider and no AI execution');
        if (input.outcome === 'retry' && !['network', 'timeout', 'busy'].includes(input.capture.reasonCode))
          throw new CaptureContractError('Capture reason is not retryable');
      } else if (input.capture) throw new CaptureContractError('Generic task cannot contain capture result');
    } catch (error) {
      throw new NexusTaskValidationError(error.message);
    }

    const attempt = await NexusTaskAttempt.findOne({
      where: { taskId: task.id, attempt: input.attempt },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!attempt || !hashesMatch(attempt.leaseTokenHash, leaseTokenHash)) {
      throw new NexusTaskConflictError('Lease or attempt does not match');
    }

    if (attempt.resultFingerprint) {
      if (attempt.resultFingerprint !== fingerprint) {
        throw new NexusTaskConflictError('Conflicting result already reported');
      }
      if (task.attemptCount !== input.attempt) {
        throw new NexusTaskConflictError('Attempt is superseded');
      }
      return { task, duplicate: true };
    }

    if (
      task.status !== 'leased' ||
      task.attemptCount !== input.attempt ||
      !hashesMatch(task.leaseTokenHash, leaseTokenHash) ||
      !task.leaseExpiresAt ||
      task.leaseExpiresAt.getTime() <= now.getTime()
    ) {
      throw new NexusTaskConflictError('Lease is expired, superseded, or inactive');
    }

    if (input.outcome === 'retry' && (!input.retryAt || input.retryAt.getTime() <= now.getTime())) {
      throw new NexusTaskValidationError('retry requires a future retryAt');
    }

    attempt.resultFingerprint = fingerprint;
    attempt.outcome = input.outcome;
    attempt.provider = input.provider;
    attempt.summary = input.summary;
    attempt.error = input.error;
    attempt.retryable = input.retryable;
    attempt.retryAt = input.retryAt;
    attempt.resultReceivedAt = now;
    attempt.execution = input.execution || null;
    attempt.capture = input.capture || null;
    await attempt.save({ transaction });

    task.provider = input.provider;
    if (task.operation?.kind !== 'tiktok.send' || !['sent', 'sending'].includes(task.capture?.state))
      task.capture = input.capture || null;
    task.resultSummary = input.outcome === 'completed' ? input.summary : null;
    task.lastError = input.error;
    clearLease(task);

    if (input.outcome === 'completed') {
      task.status = 'completed';
      task.availableAt = null;
      task.completedAt = now;
    } else if (input.outcome === 'failed' || task.attemptCount >= task.maxAttempts) {
      task.status = 'failed';
      task.availableAt = null;
      task.completedAt = now;
    } else {
      task.status = 'queued';
      task.availableAt = input.retryAt;
      task.completedAt = null;
    }

    await enqueueNexusTaskNotification(task, transaction, false, attempt.execution);
    await task.save({ transaction });
    return { task, duplicate: false };
  });
};

// Also run without a poller, so abandoned leases reach a terminal state.
export const sweepExpiredNexusTaskLeases = (now = new Date()) =>
  sequelize.transaction((transaction) => recoverExpiredLeases(null, now, transaction));

export const getNexusTask = async (ownerChatId: string, taskId: string) => {
  await requireNexusTaskOwner(ownerChatId);
  const task = await NexusTask.findOne({ where: { id: taskId, ownerChatId } });
  if (!task) throw new NexusTaskNotFoundError('Task not found');
  const attempts = await NexusTaskAttempt.findAll({ where: { taskId }, order: [['attempt', 'ASC']] });
  return { task, attempts };
};

export const summarizeNexusTaskUsage = (attempts: Array<{ attempt: number; execution: NexusTaskExecution | null }>) => {
  const executions = new Map<number, NexusTaskExecution | null>();
  for (const attempt of attempts) {
    const key = attempt.execution?.reusedFromAttempt ?? attempt.attempt;
    if (!executions.has(key) || attempt.execution) executions.set(key, attempt.execution);
  }
  const totals: Record<string, number | null> = {};
  for (const key of [
    'inputTokens',
    'cachedInputTokens',
    'outputTokens',
    'reasoningOutputTokens',
    'durationMs',
  ] as const) {
    const values = [...executions.values()].map((execution) => execution?.[key] ?? null);
    const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    totals[key] =
      values.length && values.every((value) => value !== null) && Number.isSafeInteger(total) ? total : null;
  }
  return totals;
};
