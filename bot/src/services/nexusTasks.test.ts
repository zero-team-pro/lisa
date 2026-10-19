import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/models', () => ({
  AdminUser: {},
  TelegramUser: { findByPk: jest.fn() },
  NexusTask: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  },
  NexusTaskAttempt: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
  },
}));

jest.mock('./nexusTaskNotifications', () => ({ enqueueNexusTaskNotification: jest.fn() }));

jest.mock('@/utils/uuid', () => ({ uuid: () => '00000000-0000-4000-8000-000000000001' }));

import { NexusTask, NexusTaskAttempt, TelegramUser, sequelize } from '@/models';
import { enqueueNexusTaskNotification } from './nexusTaskNotifications';
import { Op, UniqueConstraintError } from 'sequelize';
import {
  claimNexusTask,
  createNexusTask,
  NexusTaskConflictError,
  NexusTaskNotFoundError,
  NexusTaskValidationError,
  sweepExpiredNexusTaskLeases,
  summarizeNexusTaskUsage,
  getNexusTask,
  reportNexusTaskResult,
} from './nexusTasks';

const transaction = { LOCK: { UPDATE: 'UPDATE' } };
const mockTransaction = () =>
  jest.mocked(sequelize.transaction).mockImplementation(async (callback: any) => callback(transaction));

const task = (overrides: Record<string, unknown> = {}) => ({
  id: '00000000-0000-4000-8000-000000000001',
  ownerChatId: '123',
  createdBy: { type: 'telegram', telegramUserId: '123', adminUserId: 9 },
  text: 'work',
  source: 'telegram',
  status: 'queued',
  attemptCount: 0,
  maxAttempts: 3,
  availableAt: new Date('2026-07-17T10:00:00.000Z'),
  createdAt: new Date('2026-07-17T09:00:00.000Z'),
  updatedAt: new Date('2026-07-17T10:00:00.000Z'),
  workerId: null,
  leaseTokenHash: null,
  leaseExpiresAt: null,
  provider: null,
  resultSummary: null,
  lastError: null,
  completedAt: null,
  save: jest.fn(async function (this: any) {
    this.updatedAt = new Date('2026-07-17T10:00:00.000Z');
    return this;
  }),
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  mockTransaction();
  jest.mocked(TelegramUser.findByPk).mockResolvedValue({ admin: { id: 9, role: 'globalAdmin' } } as never);
});

describe('Nexus task creation', () => {
  test('persists API creation without a noisy acceptance notification', async () => {
    const created = task();
    jest.mocked(NexusTask.create).mockResolvedValue(created as never);
    await expect(
      createNexusTask({
        ownerChatId: '123',
        text: 'work',
        source: 'api',
        createdBy: { type: 'api', apiTokenHash: 'a'.repeat(64), adminUserId: 9 },
      }),
    ).resolves.toEqual({
      task: created,
      created: true,
    });
    expect(enqueueNexusTaskNotification).not.toHaveBeenCalled();
  });

  test('returns the owner-scoped idempotent task for the same request id and text', async () => {
    const existing = task({ clientRequestId: 'request-1' });
    const duplicate = Object.setPrototypeOf(new Error('duplicate'), UniqueConstraintError.prototype);
    jest.mocked(NexusTask.create).mockRejectedValue(duplicate);
    jest.mocked(NexusTask.findOne).mockResolvedValue(existing as never);

    await expect(
      createNexusTask({
        ownerChatId: '123',
        text: 'work',
        source: 'api',
        createdBy: { type: 'api', apiTokenHash: 'a'.repeat(64), adminUserId: 9 },
        clientRequestId: 'request-1',
      }),
    ).resolves.toEqual({ task: existing, created: false });
    expect(NexusTask.findOne).toHaveBeenCalledWith({
      where: { ownerChatId: '123', clientRequestId: 'request-1' },
    });
    expect(enqueueNexusTaskNotification).not.toHaveBeenCalled();
  });

  test('rejects reuse of a request id with different text', async () => {
    const existing = task({ clientRequestId: 'request-1', text: 'original' });
    const duplicate = Object.setPrototypeOf(new Error('duplicate'), UniqueConstraintError.prototype);
    jest.mocked(NexusTask.create).mockRejectedValue(duplicate);
    jest.mocked(NexusTask.findOne).mockResolvedValue(existing as never);

    await expect(
      createNexusTask({
        ownerChatId: '123',
        text: 'different',
        source: 'api',
        createdBy: { type: 'api', apiTokenHash: 'a'.repeat(64), adminUserId: 9 },
        clientRequestId: 'request-1',
      }),
    ).rejects.toBeInstanceOf(NexusTaskConflictError);
  });
});

describe('Nexus task claims', () => {
  test('uses an owner-scoped SKIP LOCKED row lock and increments the attempt', async () => {
    mockTransaction();
    const queued = task();
    jest.mocked(NexusTask.findAll).mockResolvedValue([] as never);
    jest.mocked(NexusTask.findOne).mockResolvedValue(queued as never);
    jest.mocked(NexusTaskAttempt.create).mockResolvedValue({} as never);

    const result = await claimNexusTask({
      ownerChatId: '123',
      workerId: 'nexus-mac',
      now: new Date('2026-07-17T10:00:00.000Z'),
    });

    expect(result.task).toBe(queued);
    expect(result.leaseToken).toEqual(expect.any(String));
    expect(queued.status).toBe('leased');
    expect(queued.attemptCount).toBe(1);
    expect(NexusTask.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerChatId: '123', status: 'queued' }),
        order: [
          ['createdAt', 'ASC'],
          ['id', 'ASC'],
        ],
        lock: 'UPDATE',
        skipLocked: true,
      }),
    );
    expect(NexusTaskAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: queued.id, attempt: 1, workerId: 'nexus-mac' }),
      expect.objectContaining({ transaction: expect.anything() }),
    );
  });

  test('returns no task after another overlapping claim has locked the only row', async () => {
    mockTransaction();
    jest.mocked(NexusTask.findAll).mockResolvedValue([] as never);
    jest.mocked(NexusTask.findOne).mockResolvedValue(null);

    await expect(claimNexusTask({ ownerChatId: '123', workerId: 'second' })).resolves.toMatchObject({
      task: null,
      leaseToken: null,
    });
  });

  test('permanently fails an expired third attempt', async () => {
    mockTransaction();
    const expired = task({ status: 'leased', attemptCount: 3, leaseExpiresAt: new Date('2026-07-17T09:59:00.000Z') });
    jest.mocked(NexusTask.findAll).mockResolvedValue([expired] as never);
    jest.mocked(NexusTask.findOne).mockResolvedValue(null);

    const result = await claimNexusTask({
      ownerChatId: '123',
      workerId: 'nexus-mac',
      now: new Date('2026-07-17T10:00:00.000Z'),
    });

    expect(expired.status).toBe('failed');
    expect(expired.availableAt).toBeNull();
    expect(result.exhaustedTasks).toEqual([expired]);
  });
});

describe('Nexus task results', () => {
  const completedInput = {
    ownerChatId: '123',
    taskId: '00000000-0000-4000-8000-000000000001',
    leaseToken: 'lease-token',
    outcome: 'completed' as const,
    attempt: 1,
    provider: 'codex',
    summary: 'done',
    error: null,
    retryable: false,
    retryAt: null,
    now: new Date('2026-07-17T10:10:00.000Z'),
  };

  test('completes a matching active attempt and schedules one notification', async () => {
    mockTransaction();
    const leased = task({
      status: 'leased',
      attemptCount: 1,
      leaseExpiresAt: new Date('2026-07-17T10:45:00.000Z'),
    });
    const attempt = {
      leaseTokenHash: '2c80af130e7c29586a8e40b306691fd9726d60daa488ff3580121f95a823fc38',
      resultFingerprint: null,
      save: jest.fn(),
    };
    leased.leaseTokenHash = attempt.leaseTokenHash;
    jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
    jest.mocked(NexusTaskAttempt.findOne).mockResolvedValue(attempt as never);

    const result = await reportNexusTaskResult(completedInput);

    expect(result).toMatchObject({ task: leased, duplicate: false });
    expect(leased.status).toBe('completed');
    expect(leased.resultSummary).toBe('done');
    expect(enqueueNexusTaskNotification).toHaveBeenCalledWith(leased as never, transaction as never, false, null);
  });

  test('rejects an expired result that was not previously accepted', async () => {
    mockTransaction();
    const leased = task({
      status: 'leased',
      attemptCount: 1,
      leaseExpiresAt: new Date('2026-07-17T10:00:00.000Z'),
    });
    const attempt = {
      leaseTokenHash: '2c80af130e7c29586a8e40b306691fd9726d60daa488ff3580121f95a823fc38',
      resultFingerprint: null,
    };
    leased.leaseTokenHash = attempt.leaseTokenHash;
    jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
    jest.mocked(NexusTaskAttempt.findOne).mockResolvedValue(attempt as never);

    await expect(reportNexusTaskResult(completedInput)).rejects.toBeInstanceOf(NexusTaskConflictError);
  });

  test('returns the accepted response for an identical duplicate and rejects a conflicting repeat', async () => {
    mockTransaction();
    const leased = task({
      status: 'leased',
      attemptCount: 1,
      leaseExpiresAt: new Date('2026-07-17T10:45:00.000Z'),
    });
    const attempt = {
      leaseTokenHash: '2c80af130e7c29586a8e40b306691fd9726d60daa488ff3580121f95a823fc38',
      resultFingerprint: null,
      save: jest.fn(),
    };
    leased.leaseTokenHash = attempt.leaseTokenHash;
    jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
    jest.mocked(NexusTaskAttempt.findOne).mockResolvedValue(attempt as never);

    await reportNexusTaskResult(completedInput);
    const duplicate = await reportNexusTaskResult(completedInput);
    expect(duplicate).toMatchObject({ duplicate: true });

    await expect(reportNexusTaskResult({ ...completedInput, summary: 'different' })).rejects.toBeInstanceOf(
      NexusTaskConflictError,
    );
    await expect(
      reportNexusTaskResult({ ...completedInput, execution: { model: 'changed' } as any }),
    ).rejects.toBeInstanceOf(NexusTaskConflictError);
  });

  test('schedules a future retry without changing the task id', async () => {
    mockTransaction();
    const leased = task({
      status: 'leased',
      attemptCount: 1,
      leaseExpiresAt: new Date('2026-07-17T10:45:00.000Z'),
    });
    const attempt = {
      leaseTokenHash: '2c80af130e7c29586a8e40b306691fd9726d60daa488ff3580121f95a823fc38',
      resultFingerprint: null,
      save: jest.fn(),
    };
    leased.leaseTokenHash = attempt.leaseTokenHash;
    jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
    jest.mocked(NexusTaskAttempt.findOne).mockResolvedValue(attempt as never);
    const retryAt = new Date('2026-07-17T10:15:00.000Z');

    const result = await reportNexusTaskResult({
      ...completedInput,
      outcome: 'retry',
      summary: null,
      error: 'temporary failure',
      retryable: true,
      retryAt,
    });

    expect(result.task.id).toBe(completedInput.taskId);
    expect(leased.status).toBe('queued');
    expect(leased.availableAt).toEqual(retryAt);
    expect(leased.attemptCount).toBe(1);
  });

  test('turns a retry outcome into permanent failure after attempt three', async () => {
    mockTransaction();
    const leased = task({
      status: 'leased',
      attemptCount: 3,
      leaseExpiresAt: new Date('2026-07-17T10:45:00.000Z'),
    });
    const attempt = {
      leaseTokenHash: '2c80af130e7c29586a8e40b306691fd9726d60daa488ff3580121f95a823fc38',
      resultFingerprint: null,
      save: jest.fn(),
    };
    leased.leaseTokenHash = attempt.leaseTokenHash;
    jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
    jest.mocked(NexusTaskAttempt.findOne).mockResolvedValue(attempt as never);

    await reportNexusTaskResult({
      ...completedInput,
      attempt: 3,
      outcome: 'retry',
      summary: null,
      error: 'temporary failure',
      retryable: true,
      retryAt: new Date('2026-07-17T10:15:00.000Z'),
    });

    expect(leased.status).toBe('failed');
    expect(leased.availableAt).toBeNull();
  });

  test('accepts a non-retryable failed outcome as terminal', async () => {
    mockTransaction();
    const leased = task({
      status: 'leased',
      attemptCount: 1,
      leaseExpiresAt: new Date('2026-07-17T10:45:00.000Z'),
    });
    const attempt = {
      leaseTokenHash: '2c80af130e7c29586a8e40b306691fd9726d60daa488ff3580121f95a823fc38',
      resultFingerprint: null,
      save: jest.fn(),
    };
    leased.leaseTokenHash = attempt.leaseTokenHash;
    jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
    jest.mocked(NexusTaskAttempt.findOne).mockResolvedValue(attempt as never);

    await reportNexusTaskResult({
      ...completedInput,
      outcome: 'failed',
      summary: null,
      error: 'policy rejection',
      retryable: false,
    });

    expect(leased.status).toBe('failed');
    expect(leased.lastError).toBe('policy rejection');
    expect(leased.completedAt).toEqual(completedInput.now);
  });

  test('accepts an identical retry callback after retryAt without another event', async () => {
    const leased = task({ status: 'leased', attemptCount: 1, leaseExpiresAt: new Date('2026-07-17T10:45:00Z') });
    const attempt = {
      leaseTokenHash: '2c80af130e7c29586a8e40b306691fd9726d60daa488ff3580121f95a823fc38',
      resultFingerprint: null,
      save: jest.fn(),
    };
    leased.leaseTokenHash = attempt.leaseTokenHash;
    jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
    jest.mocked(NexusTaskAttempt.findOne).mockResolvedValue(attempt as never);
    const input = {
      ...completedInput,
      outcome: 'retry' as const,
      summary: null,
      error: 'temporary',
      retryable: true,
      retryAt: new Date('2026-07-17T10:15:00Z'),
    };
    await reportNexusTaskResult(input);
    await expect(reportNexusTaskResult({ ...input, now: new Date('2026-07-17T11:00:00Z') })).resolves.toMatchObject({
      duplicate: true,
    });
    expect(enqueueNexusTaskNotification).toHaveBeenCalledTimes(1);
    leased.attemptCount = 2;
    await expect(reportNexusTaskResult(input)).rejects.toBeInstanceOf(NexusTaskConflictError);
    expect(enqueueNexusTaskNotification).toHaveBeenCalledTimes(1);
  });

  test('rejects a new retry whose retryAt has passed', async () => {
    const leased = task({ status: 'leased', attemptCount: 1, leaseExpiresAt: new Date('2026-07-17T10:45:00Z') });
    const attempt = {
      leaseTokenHash: '2c80af130e7c29586a8e40b306691fd9726d60daa488ff3580121f95a823fc38',
      resultFingerprint: null,
    };
    leased.leaseTokenHash = attempt.leaseTokenHash;
    jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
    jest.mocked(NexusTaskAttempt.findOne).mockResolvedValue(attempt as never);
    await expect(
      reportNexusTaskResult({
        ...completedInput,
        outcome: 'retry',
        summary: null,
        error: 'temporary',
        retryable: true,
        retryAt: completedInput.now,
      }),
    ).rejects.toBeInstanceOf(NexusTaskValidationError);
    expect(enqueueNexusTaskNotification).not.toHaveBeenCalled();
  });

  test('retry and completion each enqueue their own notification', async () => {
    const leased = task({ status: 'leased', attemptCount: 1, leaseExpiresAt: new Date('2026-07-17T10:45:00Z') });
    const attempt = {
      leaseTokenHash: '2c80af130e7c29586a8e40b306691fd9726d60daa488ff3580121f95a823fc38',
      resultFingerprint: null,
      save: jest.fn(),
    };
    leased.leaseTokenHash = attempt.leaseTokenHash;
    jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
    jest.mocked(NexusTaskAttempt.findOne).mockResolvedValue(attempt as never);
    await reportNexusTaskResult({
      ...completedInput,
      outcome: 'retry',
      summary: null,
      error: 'temporary',
      retryable: true,
      retryAt: new Date('2026-07-17T10:15:00Z'),
    });
    Object.assign(leased, {
      status: 'leased',
      attemptCount: 2,
      leaseTokenHash: attempt.leaseTokenHash,
      leaseExpiresAt: new Date('2026-07-17T11:00:00Z'),
    });
    attempt.resultFingerprint = null;
    await reportNexusTaskResult({ ...completedInput, attempt: 2 });
    expect(enqueueNexusTaskNotification).toHaveBeenCalledTimes(2);
  });

  test('does not disclose a task owned by another token', async () => {
    mockTransaction();
    jest.mocked(NexusTask.findOne).mockResolvedValue(null);
    await expect(reportNexusTaskResult({ ...completedInput, ownerChatId: '456' })).rejects.toBeInstanceOf(
      NexusTaskNotFoundError,
    );
  });
});

describe('lease maintenance without a poller', () => {
  test('recovers every owner and queues a retry or terminal notification', async () => {
    const retry = task({ status: 'leased', attemptCount: 1 });
    const failed = task({ status: 'leased', attemptCount: 3 });
    jest.mocked(NexusTask.findAll).mockResolvedValue([retry, failed] as never);
    await sweepExpiredNexusTaskLeases(new Date('2026-07-17T11:00:00Z'));
    expect(retry.status).toBe('queued');
    expect(failed.status).toBe('failed');
    expect(enqueueNexusTaskNotification).toHaveBeenCalledTimes(2);
  });
});

describe('execution usage totals', () => {
  const execution = {
    model: 'test-model',
    reasoningEffort: 'medium',
    inputTokens: 100,
    cachedInputTokens: 80,
    outputTokens: 20,
    reasoningOutputTokens: null,
    durationMs: 200,
    reusedFromAttempt: null,
  };
  test('sums real retries but counts replayed executions only once', () => {
    expect(
      summarizeNexusTaskUsage([
        { attempt: 1, execution },
        { attempt: 2, execution: { ...execution, reusedFromAttempt: 1 } },
        { attempt: 3, execution },
      ]),
    ).toEqual({
      inputTokens: 200,
      cachedInputTokens: 160,
      outputTokens: 40,
      reasoningOutputTokens: null,
      durationMs: 400,
    });
  });
  test('does not replace unknown usage with zero and recovers telemetry from a replay', () => {
    expect(summarizeNexusTaskUsage([{ attempt: 1, execution: null }]).inputTokens).toBeNull();
    expect(
      summarizeNexusTaskUsage([
        { attempt: 1, execution: null },
        { attempt: 2, execution },
      ]).inputTokens,
    ).toBeNull();
    expect(
      summarizeNexusTaskUsage([
        { attempt: 1, execution: null },
        { attempt: 2, execution: { ...execution, reusedFromAttempt: 1 } },
      ]).inputTokens,
    ).toBe(100);
  });
  test('task inspection stays owner-scoped and does not load foreign attempt data', async () => {
    jest.mocked(NexusTask.findOne).mockResolvedValue(null);
    await expect(getNexusTask('456', 'task-id')).rejects.toBeInstanceOf(NexusTaskNotFoundError);
    expect(NexusTaskAttempt.findAll).not.toHaveBeenCalled();
  });
});

describe('task creation authorization at the service boundary', () => {
  test('rejects direct internal creation with no verified actor', async () => {
    await expect(createNexusTask({ ownerChatId: '123', text: 'work', source: 'telegram' })).rejects.toThrow(
      'authenticated globalAdmin creator',
    );
    expect(NexusTask.create).not.toHaveBeenCalled();
  });
  test('rejects a forged Telegram creator different from the private owner', async () => {
    await expect(
      createNexusTask({
        ownerChatId: '123',
        text: 'work',
        source: 'telegram',
        createdBy: { type: 'telegram', telegramUserId: '456', adminUserId: 9 },
      }),
    ).rejects.toThrow('authenticated globalAdmin creator');
    expect(NexusTask.create).not.toHaveBeenCalled();
  });
  test('never hands an unaudited older draft task to the worker', async () => {
    const queued = task({ createdBy: null });
    jest.mocked(NexusTask.findAll).mockResolvedValue([]);
    jest.mocked(NexusTask.findOne).mockResolvedValue(queued as never);
    const result = await claimNexusTask({ ownerChatId: '123', workerId: 'worker' });
    expect(result.task).toBeNull();
    expect(queued.status).toBe('failed');
    expect(NexusTaskAttempt.create).not.toHaveBeenCalled();
  });
  test('rechecks current AdminUser role before every service operation', async () => {
    jest.mocked(TelegramUser.findByPk).mockResolvedValue({ admin: { id: 9, role: 'user' } } as never);
    await expect(
      createNexusTask({
        ownerChatId: '123',
        text: 'work',
        source: 'api',
        createdBy: { type: 'api', apiTokenHash: 'a'.repeat(64), adminUserId: 9 },
      }),
    ).rejects.toThrow('linked globalAdmin');
    await expect(claimNexusTask({ ownerChatId: '123', workerId: 'worker' })).rejects.toThrow('linked globalAdmin');
    await expect(getNexusTask('123', 'task-id')).rejects.toThrow('linked globalAdmin');
    await expect(reportNexusTaskResult({ ownerChatId: '123' } as any)).rejects.toThrow('linked globalAdmin');
    expect(NexusTask.create).not.toHaveBeenCalled();
    expect(NexusTask.findOne).not.toHaveBeenCalled();
    expect(NexusTaskAttempt.create).not.toHaveBeenCalled();
  });
});

describe('Nexus conversation claims', () => {
  test('old workers cannot claim tasks with context they would silently ignore', async () => {
    jest.mocked(NexusTask.findAll).mockResolvedValue([]);
    jest.mocked(NexusTask.findOne).mockResolvedValue(null);
    await claimNexusTask({ ownerChatId: '123', workerId: 'old-worker' });
    expect(NexusTask.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ interaction: null }) }),
    );
  });
  test('locks a conversation root and waits while another continuation is leased', async () => {
    const queued = task({ interaction: { conversationId: 'root', parentTaskId: 'parent' } });
    jest.mocked(NexusTask.findAll).mockResolvedValue([]);
    jest
      .mocked(NexusTask.findOne)
      .mockResolvedValueOnce(queued as never)
      .mockResolvedValueOnce(task({ id: 'root' }) as never)
      .mockResolvedValueOnce(task({ status: 'leased' }) as never);
    const result = await claimNexusTask({ ownerChatId: '123', workerId: 'new-worker', supportsConversations: true });
    expect(result.task).toBeNull();
    expect(queued.attemptCount).toBe(0);
    expect(NexusTaskAttempt.create).not.toHaveBeenCalled();
    expect(NexusTask.findOne).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { id: 'root', ownerChatId: '123' }, lock: 'UPDATE' }),
    );
  });
  test('rejects continuation creation when the parent is absent or belongs to another owner', async () => {
    jest.mocked(NexusTask.findOne).mockResolvedValue(null);
    await expect(
      createNexusTask({
        ownerChatId: '123',
        text: 'continue',
        source: 'telegram',
        createdBy: { type: 'telegram', telegramUserId: '123', adminUserId: 9 },
        interaction: { sourceMessageId: 50, conversationId: 'forged', parentTaskId: 'foreign-parent', context: [] },
      }),
    ).rejects.toThrow('Continuation parent is unavailable');
    expect(NexusTask.create).not.toHaveBeenCalled();
    expect(NexusTask.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'foreign-parent', ownerChatId: '123', status: 'completed' } }),
    );
  });
});

import { captureOperationWhere } from './nexusTasks';
const captureOperation = {
  kind: 'tiktok.capture' as const,
  version: 1 as const,
  routingVersion: 1 as const,
  url: 'https://vt.tiktok.com/TEST/',
  note: '',
};
const captureInput = {
  ownerChatId: '123',
  text: 'TikTok capture',
  source: 'telegram' as const,
  operation: captureOperation,
  createdBy: { type: 'telegram' as const, telegramUserId: '123', adminUserId: 9 },
};

describe('capture-aware queue services', () => {
  test('creation validates operation and persists normalized payload without acceptance event', async () => {
    jest.mocked(NexusTask.create).mockResolvedValue(task({ operation: captureOperation }) as never);
    await createNexusTask(captureInput);
    expect(NexusTask.create).toHaveBeenCalledWith(
      expect.objectContaining({ operation: captureOperation }),
      expect.anything(),
    );
    expect(enqueueNexusTaskNotification).not.toHaveBeenCalled();
    await expect(
      createNexusTask({ ...captureInput, operation: { ...captureOperation, version: 2 } as never }),
    ).rejects.toBeInstanceOf(NexusTaskValidationError);
    await expect(
      createNexusTask({
        ...captureInput,
        interaction: { sourceMessageId: 42, conversationId: '', parentTaskId: 'old', context: [] },
      }),
    ).rejects.toBeInstanceOf(NexusTaskValidationError);
  });
  test('same message key with changed note conflicts even when text stays equal', async () => {
    const duplicate = Object.setPrototypeOf(new Error('duplicate'), UniqueConstraintError.prototype);
    jest.mocked(NexusTask.create).mockRejectedValue(duplicate);
    jest
      .mocked(NexusTask.findOne)
      .mockResolvedValue(task({ text: captureInput.text, operation: captureOperation }) as never);
    await expect(
      createNexusTask({ ...captureInput, clientRequestId: 'msg', operation: { ...captureOperation, note: 'changed' } }),
    ).rejects.toBeInstanceOf(NexusTaskConflictError);
  });
  test('old workers filter operation-null; capable workers explicitly include only version 1', () => {
    expect(captureOperationWhere()).toEqual({ operation: null });
    expect(captureOperationWhere(['tiktok.capture.v1'])).toEqual({
      [Op.or]: [
        { operation: null },
        { 'operation.kind': 'tiktok.capture', 'operation.version': 1, 'operation.routingVersion': 1 },
      ],
    });
    expect(() => captureOperationWhere(['unknown'])).toThrow();
  });
  test('capture result persists to task/attempt and exact replay conflicts on changed ID', async () => {
    const leased = task({
      status: 'leased',
      attemptCount: 1,
      operation: captureOperation,
      leaseExpiresAt: new Date('2026-07-17T10:45:00Z'),
      leaseTokenHash: '2c80af130e7c29586a8e40b306691fd9726d60daa488ff3580121f95a823fc38',
    });
    const attempt = { leaseTokenHash: leased.leaseTokenHash, resultFingerprint: null, save: jest.fn() };
    jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
    jest.mocked(NexusTaskAttempt.findOne).mockResolvedValue(attempt as never);
    const input = {
      ownerChatId: '123',
      taskId: leased.id,
      leaseToken: 'lease-token',
      attempt: 1,
      outcome: 'completed' as const,
      provider: 'local',
      summary: 'internal result',
      error: null,
      retryable: false,
      retryAt: null,
      now: new Date('2026-07-17T10:10:00Z'),
      capture: { libraryId: '00001', state: 'saved' as const, reasonCode: null },
    };
    await reportNexusTaskResult(input);
    expect(leased).toMatchObject({ capture: input.capture });
    expect(attempt).toMatchObject({ capture: input.capture });
    expect((await reportNexusTaskResult(input)).duplicate).toBe(true);
    await expect(
      reportNexusTaskResult({ ...input, capture: { ...input.capture, libraryId: '00002' } }),
    ).rejects.toBeInstanceOf(NexusTaskConflictError);
  });
  test('capture rejects missing/AI result metadata and generic task rejects capture metadata', async () => {
    const leased = task({ operation: captureOperation });
    jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
    const input = {
      ownerChatId: '123',
      taskId: leased.id,
      leaseToken: 'lease-token',
      attempt: 1,
      outcome: 'completed' as const,
      provider: 'codex',
      summary: 'result',
      error: null,
      retryable: false,
      retryAt: null,
    };
    await expect(reportNexusTaskResult(input)).rejects.toBeInstanceOf(NexusTaskValidationError);
    await expect(
      reportNexusTaskResult({ ...input, capture: { libraryId: '00001', state: 'saved', reasonCode: null } }),
    ).rejects.toBeInstanceOf(NexusTaskValidationError);
    jest.mocked(NexusTask.findOne).mockResolvedValue(task() as never);
    await expect(
      reportNexusTaskResult({
        ...input,
        provider: 'local',
        capture: { libraryId: '00001', state: 'saved', reasonCode: null },
      }),
    ).rejects.toBeInstanceOf(NexusTaskValidationError);
  });
});

test('send capability is isolated from capture-only workers', () => {
  const where = captureOperationWhere(['tiktok.send.v1']) as any;
  expect(JSON.stringify(where[Op.or])).toContain('tiktok.send');
  expect(JSON.stringify(where[Op.or])).not.toContain('tiktok.capture');
});

test('send completion requires a server-confirmed receipt and cannot claim a library item', async () => {
  const leased = task({
    status: 'leased',
    attemptCount: 1,
    operation: { ...captureOperation, kind: 'tiktok.send', note: '' },
    leaseExpiresAt: new Date('2026-07-17T10:45:00Z'),
    leaseTokenHash: '2c80af130e7c29586a8e40b306691fd9726d60daa488ff3580121f95a823fc38',
    capture: null,
  });
  const attempt = { leaseTokenHash: leased.leaseTokenHash, resultFingerprint: null, save: jest.fn() };
  jest.mocked(NexusTask.findOne).mockResolvedValue(leased as never);
  jest.mocked(NexusTaskAttempt.findOne).mockResolvedValue(attempt as never);
  const input = {
    ownerChatId: '123',
    taskId: leased.id,
    leaseToken: 'lease-token',
    attempt: 1,
    outcome: 'completed' as const,
    provider: 'local',
    summary: 'sent',
    error: null,
    retryable: false,
    retryAt: null,
    now: new Date('2026-07-17T10:10:00Z'),
    capture: { libraryId: null, state: 'sent' as const, reasonCode: null },
  };
  await expect(reportNexusTaskResult(input)).rejects.toBeInstanceOf(NexusTaskValidationError);
  (leased as any).capture = input.capture;
  await expect(
    reportNexusTaskResult({ ...input, capture: { libraryId: '00001', state: 'saved', reasonCode: null } }),
  ).rejects.toBeInstanceOf(NexusTaskValidationError);
  await reportNexusTaskResult(input);
  expect(leased.status).toBe('completed');
  expect((leased as any).capture.libraryId).toBeNull();
});
