import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/services/nexusTasks', () => ({
  NEXUS_TASK_CLIENT_REQUEST_ID_MAX_LENGTH: 200,
  NEXUS_TASK_LEASE_SECONDS: 2700,
  NEXUS_TASK_TEXT_MAX_LENGTH: 10_000,
  NexusTaskConflictError: class NexusTaskConflictError extends Error {},
  NexusTaskNotFoundError: class NexusTaskNotFoundError extends Error {},
  NexusTaskValidationError: class NexusTaskValidationError extends Error {},
  claimNexusTask: jest.fn(),
  getNexusTask: jest.fn(),
  summarizeNexusTaskUsage: jest.fn(),
  createNexusTask: jest.fn(),
  reportNexusTaskResult: jest.fn(),
}));

jest.mock('@/services/nexusTaskAuthorization', () => ({
  NexusTaskForbiddenError: class NexusTaskForbiddenError extends Error {},
  requireNexusTaskOwner: jest.fn<() => Promise<{ id: number }>>().mockResolvedValue({ id: 9 }),
}));
import { NexusTaskForbiddenError, requireNexusTaskOwner } from '@/services/nexusTaskAuthorization';

jest.mock('@/services/nexusTaskAudit', () => ({
  beginTaskRequest: jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: 'audit-id' }),
  finishTaskRequest: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  taskApiActor: (token?: string) => ({ type: 'api', apiTokenHash: token ? 'token-hash' : null }),
  taskAuditPayload: (body: unknown) => ({ body }),
}));
import { beginTaskRequest, finishTaskRequest } from '@/services/nexusTaskAudit';
import { createVersionedRouter } from './versioning';
import express from 'express';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import {
  getNexusTask,
  summarizeNexusTaskUsage,
  claimNexusTask,
  createNexusTask,
  reportNexusTaskResult,
  NexusTaskNotFoundError,
  NexusTaskConflictError,
  NexusTaskValidationError,
} from '@/services/nexusTasks';
import {
  claimTask,
  createTask,
  reportTaskResult,
  getTask,
  validateTaskExecution,
  auditTaskJsonError,
  createTaskRouter,
  validateClaimTaskBody,
  validateCreateTaskBody,
  validateResultTaskBody,
} from './tasks';

const now = new Date('2026-07-17T10:00:00.000Z');

describe('/tasks/v1 payload validation', () => {
  test('validates create and the frozen 45-minute lease', () => {
    expect(validateCreateTaskBody({ text: '  do work  ', clientRequestId: 'request-1' })).toEqual({
      text: 'do work',
      clientRequestId: 'request-1',
    });
    expect(validateCreateTaskBody({ text: '   ' })).toBe('text must be a non-empty string');
    expect(validateClaimTaskBody({ workerId: 'nexus-mac' })).toEqual({ workerId: 'nexus-mac' });
    expect(validateClaimTaskBody({ workerId: 'nexus-mac', leaseSeconds: 2700 })).toEqual({ workerId: 'nexus-mac' });
    expect(validateClaimTaskBody({ workerId: 'nexus-mac', leaseSeconds: 60 })).toBe('leaseSeconds must be 2700');
  });

  test('validates completed, failed, and retry result semantics', () => {
    const base = { leaseToken: 'lease', attempt: 1, provider: 'codex' };
    expect(
      validateResultTaskBody({
        ...base,
        outcome: 'completed',
        summary: 'done',
        error: null,
        retryable: false,
        retryAt: null,
      }),
    ).toMatchObject({ outcome: 'completed', summary: 'done', retryAt: null });
    expect(
      validateResultTaskBody({
        ...base,
        outcome: 'failed',
        summary: null,
        error: 'policy',
        retryable: false,
        retryAt: null,
      }),
    ).toMatchObject({ outcome: 'failed', error: 'policy' });
    expect(
      validateResultTaskBody({
        ...base,
        outcome: 'retry',
        summary: null,
        error: 'temporary',
        retryable: true,
        retryAt: '2026-07-17T10:05:00.000Z',
      }),
    ).toMatchObject({ outcome: 'retry', error: 'temporary', retryAt: new Date('2026-07-17T10:05:00.000Z') });
  });

  test('rejects malformed dates and leaves time validity to duplicate-aware handling', () => {
    const base = {
      leaseToken: 'lease',
      attempt: 1,
      provider: 'codex',
      outcome: 'retry',
      summary: null,
      error: 'temporary',
      retryable: true,
    };
    expect(validateResultTaskBody({ ...base, retryAt: 'not-a-date' })).toBe(
      'retryAt must be an ISO date-time string or null',
    );
    expect(validateResultTaskBody({ ...base, retryAt: 'July 17, 2026 10:05 UTC' })).toBe(
      'retryAt must be an ISO date-time string or null',
    );
    expect(validateResultTaskBody({ ...base, retryAt: '2026-02-30T10:00:00Z' })).toBe(
      'retryAt must be an ISO date-time string or null',
    );
    expect(validateResultTaskBody({ ...base, retryAt: '2026-07-17T24:00:00Z' })).toBe(
      'retryAt must be an ISO date-time string or null',
    );
    // Time validity is checked after duplicate detection by the task service.
    expect(validateResultTaskBody({ ...base, retryAt: now.toISOString() })).toMatchObject({ outcome: 'retry' });
  });
});

describe('/tasks version and authentication boundary', () => {
  test('exposes the task routes only below the explicit v1 router', () => {
    const handler = (_req, res) => res.status(204).send();
    const v1 = createTaskRouter({ get: handler, create: handler, claim: handler, result: handler });
    const versioned = createVersionedRouter({ v1 }) as ReturnType<typeof createVersionedRouter> & {
      stack: Array<{ regexp: RegExp }>;
    };
    const [versionLayer] = versioned.stack;

    expect(versionLayer.regexp.test('/v1')).toBe(true);
    expect(versionLayer.regexp.test('/v1/claim')).toBe(true);
    expect(versionLayer.regexp.test('/')).toBe(false);
    expect(versionLayer.regexp.test('/claim')).toBe(false);
  });
});

describe('/tasks/v1 claim response', () => {
  test('returns 204 when no owner-scoped task is due', async () => {
    jest.mocked(claimNexusTask).mockResolvedValue({ task: null, leaseToken: null, exhaustedTasks: [] });
    const send = jest.fn();
    const status = jest.fn<(code: number) => { send: typeof send }>(() => ({ send }));
    const req = { body: { workerId: 'nexus-mac' }, app: { settings: { bridge: {} } } } as any;
    const res = { locals: { taskOwner: { chatId: 123 } }, status } as any;
    const next = jest.fn();

    await claimTask(req, res, next);

    expect(claimNexusTask).toHaveBeenCalledWith({ ownerChatId: '123', workerId: 'nexus-mac' });
    expect(status).toHaveBeenCalledWith(204);
    expect(send).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('task HTTP contract', () => {
  let app: ReturnType<typeof express>;
  const originalTokens = process.env.NOTIFY_TOKENS;
  const id = '00000000-0000-4000-8000-000000000001';
  const saved = {
    id,
    text: 'work',
    source: 'api',
    status: 'queued',
    attemptCount: 0,
    maxAttempts: 3,
    availableAt: now,
    createdAt: now,
    updatedAt: now,
  } as any;
  const resultBody = {
    leaseToken: 'lease',
    attempt: 1,
    provider: 'codex',
    outcome: 'completed',
    summary: 'done',
    error: null,
    retryable: false,
    retryAt: null,
  };
  // Exercise Express routing/auth/mapping without binding a network port.
  const dispatch = (path: string, body: unknown, token: string | null = 'first', method = 'POST') =>
    new Promise<{ status: number; json: () => Promise<any> }>((resolve) => {
      const req = new IncomingMessage(new Socket());
      req.method = method;
      req.url = path;
      req.headers = token ? { authorization: `Bearer ${token}` } : {};
      Object.assign(req, { body });
      const res = new ServerResponse(req);
      res.end = ((data) => {
        res.emit('finish');
        resolve({ status: res.statusCode, json: async () => JSON.parse(String(data)) });
        return res;
      }) as typeof res.end;
      app(req, res);
    });
  beforeAll(() => {
    process.env.NOTIFY_TOKENS = 'first:123,second:456';
    app = express().use(
      '/tasks',
      createVersionedRouter({
        v1: createTaskRouter({ get: getTask, create: createTask, claim: claimTask, result: reportTaskResult }),
      }),
    );
    app.use((_req, res) => res.sendStatus(404));
    app.use((_err, _req, res, _next) => res.sendStatus(500));
  });
  afterAll(() => {
    if (originalTokens === undefined) delete process.env.NOTIFY_TOKENS;
    else process.env.NOTIFY_TOKENS = originalTokens;
  });
  beforeEach(() => jest.clearAllMocks());

  test('rejects absent/invalid auth and exposes no unversioned fallback', async () => {
    expect((await dispatch('/tasks/v1', { text: 'work' }, null)).status).toBe(401);
    expect((await dispatch('/tasks/v1', { text: 'work' }, 'invalid')).status).toBe(401);
    expect((await dispatch('/tasks', { text: 'work' })).status).toBe(404);
    expect((await dispatch('/tasks/claim', { workerId: 'worker' })).status).toBe(404);
    expect(createNexusTask).not.toHaveBeenCalled();
    expect(beginTaskRequest).toHaveBeenCalledWith(
      'create',
      null,
      { type: 'api', apiTokenHash: null },
      expect.anything(),
    );
    expect(finishTaskRequest).toHaveBeenCalledWith('audit-id', 401, null, { type: 'api', apiTokenHash: null });
  });
  test('creates only for the authenticated owner and returns 201/200/409', async () => {
    jest
      .mocked(createNexusTask)
      .mockResolvedValueOnce({ task: saved, created: true })
      .mockResolvedValueOnce({ task: saved, created: false })
      .mockRejectedValueOnce(new NexusTaskConflictError('conflict'));
    expect((await dispatch('/tasks/v1', { text: 'work', chatId: 456 })).status).toBe(201);
    expect(createNexusTask).toHaveBeenCalledWith({
      ownerChatId: '123',
      text: 'work',
      source: 'api',
      clientRequestId: null,
      createdBy: { type: 'api', apiTokenHash: 'token-hash', adminUserId: 9 },
    });
    expect((await dispatch('/tasks/v1', { text: 'work' })).status).toBe(200);
    expect((await dispatch('/tasks/v1', { text: 'different' })).status).toBe(409);
  });
  test('maps invalid input, missing/cross-owner tasks, and stale lease failures', async () => {
    expect((await dispatch(`/tasks/v1/${id}/result`, {})).status).toBe(400);
    expect((await dispatch('/tasks/v1/not-a-uuid/result', resultBody)).status).toBe(404);
    jest.mocked(reportNexusTaskResult).mockRejectedValueOnce(new NexusTaskNotFoundError());
    expect((await dispatch(`/tasks/v1/${id}/result`, resultBody, 'second')).status).toBe(404);
    expect(reportNexusTaskResult).toHaveBeenCalledWith(expect.objectContaining({ ownerChatId: '456', taskId: id }));
    jest.mocked(reportNexusTaskResult).mockRejectedValueOnce(new NexusTaskConflictError('stale'));
    expect((await dispatch(`/tasks/v1/${id}/result`, resultBody)).status).toBe(409);
    jest.mocked(reportNexusTaskResult).mockRejectedValueOnce(new NexusTaskValidationError('past retryAt'));
    expect((await dispatch(`/tasks/v1/${id}/result`, resultBody)).status).toBe(400);
  });
  test('returns the exact claimed lease fields and 204 for an empty queue', async () => {
    jest
      .mocked(claimNexusTask)
      .mockResolvedValueOnce({
        task: { ...saved, status: 'leased', attemptCount: 1, leaseExpiresAt: now },
        leaseToken: 'opaque',
        exhaustedTasks: [],
      })
      .mockResolvedValueOnce({ task: null, leaseToken: null, exhaustedTasks: [] });
    const response = await dispatch('/tasks/v1/claim', { workerId: 'worker' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      task: {
        id,
        text: 'work',
        source: 'api',
        status: 'leased',
        attempt: 1,
        maxAttempts: 3,
        leaseToken: 'opaque',
        leaseExpiresAt: now.toISOString(),
        createdAt: now.toISOString(),
      },
    });
    expect((await dispatch('/tasks/v1/claim', { workerId: 'worker' })).status).toBe(204);
  });
  test('returns owner-scoped attempt telemetry, totals, and requester', async () => {
    jest.mocked(getNexusTask).mockResolvedValue({
      task: { ...saved, createdBy: { type: 'telegram', telegramUserId: '777', adminUserId: 9 } },
      attempts: [
        {
          attempt: 1,
          workerId: 'worker',
          provider: 'codex',
          outcome: 'completed',
          execution: { model: 'test-model', inputTokens: 100 },
          resultReceivedAt: now,
        },
      ] as any,
    });
    jest.mocked(summarizeNexusTaskUsage).mockReturnValue({ inputTokens: 100 });
    const response = await dispatch(`/tasks/v1/${id}`, undefined, 'first', 'GET');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.task.createdBy.telegramUserId).toBe('777');
    expect(body.task.attempts[0].execution.model).toBe('test-model');
    expect(body.task.usage.inputTokens).toBe(100);
    expect(getNexusTask).toHaveBeenCalledWith('123', id);
    jest.mocked(getNexusTask).mockRejectedValueOnce(new NexusTaskNotFoundError());
    expect((await dispatch(`/tasks/v1/${id}`, undefined, 'second', 'GET')).status).toBe(404);
  });

  test('refuses to execute an operation when the audit cannot be persisted', async () => {
    jest.mocked(beginTaskRequest).mockRejectedValueOnce(new Error('database unavailable'));
    expect((await dispatch('/tasks/v1', { text: 'work' })).status).toBe(500);
    expect(createNexusTask).not.toHaveBeenCalled();
  });

  test.each([
    [
      '/tasks/v1',
      'POST',
      { text: 'run unsafe code', adminUserId: 9, role: 'globalAdmin', createdBy: { adminUserId: 9 } },
    ],
    ['/tasks/v1/claim', 'POST', { workerId: 'attacker' }],
    [`/tasks/v1/${id}/result`, 'POST', resultBody],
    [`/tasks/v1/${id}`, 'GET', undefined],
  ])('denies every task operation when a configured token has no globalAdmin owner: %s', async (path, method, body) => {
    jest.mocked(requireNexusTaskOwner).mockRejectedValueOnce(new NexusTaskForbiddenError('not linked'));
    expect((await dispatch(path as string, body, 'first', method as string)).status).toBe(403);
    expect(createNexusTask).not.toHaveBeenCalled();
    expect(claimNexusTask).not.toHaveBeenCalled();
    expect(reportNexusTaskResult).not.toHaveBeenCalled();
    expect(getNexusTask).not.toHaveBeenCalled();
  });

  test('fails closed if the administrator lookup fails', async () => {
    jest.mocked(requireNexusTaskOwner).mockRejectedValueOnce(new Error('database unavailable'));
    expect((await dispatch('/tasks/v1', { text: 'work' })).status).toBe(500);
    expect(createNexusTask).not.toHaveBeenCalled();
  });

  test('maps a successful result without leaking internal task fields', async () => {
    jest.mocked(reportNexusTaskResult).mockResolvedValue({
      task: { ...saved, status: 'completed', attemptCount: 1, availableAt: null },
      duplicate: false,
    });
    const response = await dispatch(`/tasks/v1/${id}/result`, resultBody);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      task: { id, status: 'completed', attemptCount: 1, availableAt: null, updatedAt: now.toISOString() },
    });
  });
});

describe('execution metadata validation', () => {
  test('keeps legacy callbacks valid and rejects impossible or malformed counters', () => {
    expect(validateTaskExecution(undefined, 1)).toBeNull();
    expect(
      validateTaskExecution({ model: 'test-model', inputTokens: 100, cachedInputTokens: 40, outputTokens: 20 }, 1),
    ).toMatchObject({
      model: 'test-model',
      inputTokens: 100,
      cachedInputTokens: 40,
      outputTokens: 20,
      reasoningOutputTokens: null,
    });
    expect(typeof validateTaskExecution({ inputTokens: -1 }, 1)).toBe('string');
    expect(typeof validateTaskExecution({ inputTokens: 1.5 }, 1)).toBe('string');
    expect(typeof validateTaskExecution({ inputTokens: 10, cachedInputTokens: 20 }, 1)).toBe('string');
    expect(typeof validateTaskExecution({ outputTokens: 10, reasoningOutputTokens: 20 }, 1)).toBe('string');
    expect(typeof validateTaskExecution({ reusedFromAttempt: 1 }, 1)).toBe('string');
    expect(validateTaskExecution({ reusedFromAttempt: 1 }, 2)).toMatchObject({ reusedFromAttempt: 1 });
  });
});

test('audits malformed JSON rejected before the task router', async () => {
  jest.clearAllMocks();
  const original = process.env.NOTIFY_TOKENS;
  process.env.NOTIFY_TOKENS = 'first:123';
  const cause = { type: 'entity.parse.failed' };
  const next = jest.fn();
  try {
    await auditTaskJsonError(cause, { path: '/tasks/v1/claim', get: () => 'Bearer first' } as any, {} as any, next);
    expect(beginTaskRequest).toHaveBeenCalledWith(
      'claim',
      '123',
      { type: 'api', apiTokenHash: 'token-hash' },
      { path: '/tasks/v1/claim', malformedJson: true },
    );
    expect(finishTaskRequest).toHaveBeenCalledWith('audit-id', 400);
    expect(next).toHaveBeenCalledWith(cause);
  } finally {
    if (original === undefined) delete process.env.NOTIFY_TOKENS;
    else process.env.NOTIFY_TOKENS = original;
  }
});
