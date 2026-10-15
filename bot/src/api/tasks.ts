import { ErrorRequestHandler, RequestHandler, Response, Router } from 'express';

import type { NexusTask } from '@/models';
import type { NexusTaskExecution } from '@/models/nexusTaskAttempt';
import { Logger } from '@/controllers/logger';
import { NexusTaskForbiddenError, requireNexusTaskOwner } from '@/services/nexusTaskAuthorization';
import { beginTaskRequest, finishTaskRequest, taskApiActor, taskAuditPayload } from '@/services/nexusTaskAudit';
import { createTaskRequestLimiter } from '@/services/nexusTaskRateLimit';
import { authenticateNotifyToken } from '@/auth/notifyToken';
import {
  claimNexusTask,
  createNexusTask,
  getNexusTask,
  summarizeNexusTaskUsage,
  NEXUS_TASK_CLIENT_REQUEST_ID_MAX_LENGTH,
  NexusTaskConflictError,
  NEXUS_TASK_LEASE_SECONDS,
  NexusTaskNotFoundError,
  NexusTaskValidationError,
  NEXUS_TASK_TEXT_MAX_LENGTH,
  reportNexusTaskResult,
  ReportNexusTaskResultInput,
} from '@/services/nexusTasks';

const error = (res: Response, status: number, message: string) => res.status(status).send({ error: message });

const taskForCreate = (task: NexusTask) => ({
  id: task.id,
  text: task.text,
  source: task.source,
  interaction: task.interaction || null,
  status: task.status,
  attemptCount: task.attemptCount,
  maxAttempts: task.maxAttempts,
  availableAt: task.availableAt?.toISOString() || null,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
});

const taskForClaim = (task: NexusTask, leaseToken: string) => ({
  id: task.id,
  text: task.text,
  source: task.source,
  interaction: task.interaction || null,
  status: task.status,
  attempt: task.attemptCount,
  maxAttempts: task.maxAttempts,
  leaseToken,
  leaseExpiresAt: task.leaseExpiresAt.toISOString(),
  createdAt: task.createdAt.toISOString(),
});

const taskForResult = (task: NexusTask) => ({
  id: task.id,
  status: task.status,
  attemptCount: task.attemptCount,
  availableAt: task.availableAt?.toISOString() || null,
  updatedAt: task.updatedAt.toISOString(),
});

const consumeTaskRequest = createTaskRequestLimiter();

const validTaskId = (id: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const auditTaskRequest =
  (operation: string): RequestHandler =>
  async (req, res, next) => {
    try {
      const owner = authenticateNotifyToken(req.get('authorization'));
      const actor = taskApiActor(owner?.token);
      if (!consumeTaskRequest(actor.apiTokenHash || null)) {
        res.set('Retry-After', '60');
        return error(res, 429, 'Too many task requests');
      }
      const payload = taskAuditPayload(owner ? req.body : null);
      if (req.params.id) payload.requestedTaskId = req.params.id;
      const record = await beginTaskRequest(operation, owner ? String(owner.chatId) : null, actor, payload);
      res.locals.taskOwner = owner;
      res.locals.taskActor = actor;
      res.locals.taskAuditTaskId = validTaskId(req.params.id || '') ? req.params.id : null;
      res.once('finish', () => {
        void finishTaskRequest(record.id, res.statusCode, res.locals.taskAuditTaskId, res.locals.taskActor).catch(
          () => {
            Logger.error('Task request audit completion failed', { requestId: record.id }, 'Tasks');
          },
        );
      });
      next();
    } catch (cause) {
      // No task operation runs without a durable audit entry.
      next(cause);
    }
  };

// JSON parsing precedes the router. Preserve actor/operation evidence for those
// rejected requests too, without retaining the malformed body or credentials.
export const auditTaskJsonError: ErrorRequestHandler = async (cause, req, res, next) => {
  if (cause?.type !== 'entity.parse.failed' || !/^\/tasks\/v1(?:\/|$)/.test(req.path)) return next(cause);
  try {
    const owner = authenticateNotifyToken(req.get('authorization'));
    const actor = taskApiActor(owner?.token);
    if (!consumeTaskRequest(actor.apiTokenHash || null)) {
      res.set('Retry-After', '60');
      return error(res, 429, 'Too many task requests');
    }
    const operation =
      req.method === 'GET'
        ? 'get'
        : req.path.endsWith('/result')
          ? 'result'
          : req.path.endsWith('/claim')
            ? 'claim'
            : 'create';
    const record = await beginTaskRequest(operation, owner ? String(owner.chatId) : null, taskApiActor(owner?.token), {
      path: req.path,
      malformedJson: true,
    });
    await finishTaskRequest(record.id, 400);
    next(cause);
  } catch (auditError) {
    next(auditError);
  }
};

const authenticate: RequestHandler = async (_req, res, next) => {
  // auditTaskRequest already resolved the credential; never derive identity
  // from chatId/AdminUser/createdBy fields supplied in the body.
  const owner = res.locals.taskOwner;
  if (!owner) return error(res, 401, 'Unauthorized');
  try {
    const admin = await requireNexusTaskOwner(String(owner.chatId));
    res.locals.taskActor.adminUserId = admin.id;
    next();
  } catch (cause) {
    if (cause instanceof NexusTaskForbiddenError) return error(res, 403, 'Forbidden');
    next(cause);
  }
};

export const validateCreateTaskBody = (body: unknown): { text: string; clientRequestId: string | null } | string => {
  const value = body as Record<string, unknown>;
  if (!value || typeof value.text !== 'string' || value.text.trim().length === 0) {
    return 'text must be a non-empty string';
  }
  const text = value.text.trim();
  if (text.length > NEXUS_TASK_TEXT_MAX_LENGTH) {
    return `text must be at most ${NEXUS_TASK_TEXT_MAX_LENGTH} characters`;
  }
  if (
    value.clientRequestId !== undefined &&
    (typeof value.clientRequestId !== 'string' ||
      value.clientRequestId.length === 0 ||
      value.clientRequestId.length > NEXUS_TASK_CLIENT_REQUEST_ID_MAX_LENGTH)
  ) {
    return `clientRequestId must be a non-empty string of at most ${NEXUS_TASK_CLIENT_REQUEST_ID_MAX_LENGTH} characters`;
  }
  return { text, clientRequestId: (value.clientRequestId as string | undefined) || null };
};

export const validateClaimTaskBody = (
  body: unknown,
): { workerId: string; supportsConversations?: boolean } | string => {
  const value = body as Record<string, unknown>;
  if (
    !value ||
    typeof value.workerId !== 'string' ||
    value.workerId.trim().length === 0 ||
    value.workerId.length > 200
  ) {
    return 'workerId must be a non-empty string of at most 200 characters';
  }
  if (value.leaseSeconds !== undefined && value.leaseSeconds !== NEXUS_TASK_LEASE_SECONDS) {
    return `leaseSeconds must be ${NEXUS_TASK_LEASE_SECONDS}`;
  }
  if (value.supportsConversations !== undefined && typeof value.supportsConversations !== 'boolean')
    return 'supportsConversations must be boolean';
  return {
    workerId: value.workerId.trim(),
    ...(value.supportsConversations === undefined
      ? {}
      : { supportsConversations: value.supportsConversations as boolean }),
  };
};

export const validateTaskExecution = (value: unknown, attempt: number): NexusTaskExecution | null | string => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return 'execution must be an object or null';
  const input = value as Record<string, unknown>;
  const result: NexusTaskExecution = {
    model: null,
    reasoningEffort: null,
    inputTokens: null,
    cachedInputTokens: null,
    outputTokens: null,
    reasoningOutputTokens: null,
    durationMs: null,
    reusedFromAttempt: null,
  };
  for (const key of ['model', 'reasoningEffort'] as const) {
    const field = input[key];
    if (field !== undefined && field !== null) {
      if (typeof field !== 'string' || !field.trim() || field.length > 100)
        return `execution.${key} must be a non-empty string of at most 100 characters or null`;
      result[key] = field.trim();
    }
  }
  for (const key of [
    'inputTokens',
    'cachedInputTokens',
    'outputTokens',
    'reasoningOutputTokens',
    'durationMs',
    'reusedFromAttempt',
  ] as const) {
    if (input[key] !== undefined && input[key] !== null) {
      if (!Number.isSafeInteger(input[key]) || (input[key] as number) < 0)
        return `execution.${key} must be a non-negative safe integer or null`;
      result[key] = input[key] as number;
    }
  }
  if (result.cachedInputTokens !== null && result.inputTokens !== null && result.cachedInputTokens > result.inputTokens)
    return 'cachedInputTokens cannot exceed inputTokens';
  if (
    result.reasoningOutputTokens !== null &&
    result.outputTokens !== null &&
    result.reasoningOutputTokens > result.outputTokens
  )
    return 'reasoningOutputTokens cannot exceed outputTokens';
  if (result.reusedFromAttempt !== null && (result.reusedFromAttempt < 1 || result.reusedFromAttempt >= attempt))
    return 'reusedFromAttempt must refer to an earlier attempt';
  return result;
};

export const validateResultTaskBody = (
  body: unknown,
): Omit<ReportNexusTaskResultInput, 'ownerChatId' | 'taskId' | 'now'> | string => {
  const value = body as Record<string, unknown>;
  if (!value || typeof value.leaseToken !== 'string' || value.leaseToken.length === 0) {
    return 'leaseToken must be a non-empty string';
  }
  if (!Number.isSafeInteger(value.attempt) || (value.attempt as number) < 1) {
    return 'attempt must be a positive integer';
  }
  if (typeof value.provider !== 'string' || value.provider.trim().length === 0 || value.provider.length > 100) {
    return 'provider must be a non-empty string of at most 100 characters';
  }
  if (!['completed', 'failed', 'retry'].includes(value.outcome as string)) {
    return 'outcome must be completed, failed, or retry';
  }
  if (value.summary !== null && typeof value.summary !== 'string') {
    return 'summary must be a string or null';
  }
  if (value.error !== null && typeof value.error !== 'string') {
    return 'error must be a string or null';
  }
  if (typeof value.retryable !== 'boolean') {
    return 'retryable must be a boolean';
  }

  let retryAt: Date | null = null;
  if (value.retryAt !== null) {
    if (
      typeof value.retryAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
        value.retryAt,
      ) ||
      Number.isNaN(Date.parse(value.retryAt)) ||
      new Date(`${value.retryAt.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== value.retryAt.slice(0, 10)
    ) {
      return 'retryAt must be an ISO date-time string or null';
    }
    retryAt = new Date(value.retryAt);
  }

  if (
    value.outcome === 'completed' &&
    (typeof value.summary !== 'string' ||
      value.summary.trim().length === 0 ||
      value.error !== null ||
      value.retryable ||
      retryAt)
  ) {
    return 'completed requires a non-empty summary, null error, retryable false, and null retryAt';
  }
  if (
    value.outcome === 'failed' &&
    (typeof value.error !== 'string' || value.error.trim().length === 0 || value.retryable || retryAt)
  ) {
    return 'failed requires a non-empty error, retryable false, and null retryAt';
  }
  if (
    value.outcome === 'retry' &&
    (typeof value.error !== 'string' || value.error.trim().length === 0 || value.retryable !== true || !retryAt)
  ) {
    return 'retry requires a non-empty error, retryable true, and a future retryAt';
  }

  const execution = validateTaskExecution(value.execution, value.attempt as number);
  if (typeof execution === 'string') return execution;

  return {
    execution,
    leaseToken: value.leaseToken,
    outcome: value.outcome as ReportNexusTaskResultInput['outcome'],
    attempt: value.attempt as number,
    provider: value.provider.trim(),
    summary: value.summary as string | null,
    error: value.error as string | null,
    retryable: value.retryable,
    retryAt,
  };
};

export const createTask: RequestHandler = async (req, res, next) => {
  const input = validateCreateTaskBody(req.body);
  if (typeof input === 'string') {
    return error(res, 400, input);
  }
  try {
    const { task, created } = await createNexusTask({
      ownerChatId: String(res.locals.taskOwner.chatId),
      text: input.text,
      source: 'api',
      clientRequestId: input.clientRequestId,
      createdBy: res.locals.taskActor,
    });
    res.locals.taskAuditTaskId = task.id;
    return res.status(created ? 201 : 200).send({ task: taskForCreate(task) });
  } catch (cause) {
    if (cause instanceof NexusTaskForbiddenError) return error(res, 403, 'Forbidden');
    if (cause instanceof NexusTaskConflictError) {
      return error(res, 409, cause.message);
    }
    next(cause);
  }
};

export const claimTask: RequestHandler = async (req, res, next) => {
  const input = validateClaimTaskBody(req.body);
  if (typeof input === 'string') {
    return error(res, 400, input);
  }
  try {
    const claimed = await claimNexusTask({
      ownerChatId: String(res.locals.taskOwner.chatId),
      workerId: input.workerId,
      supportsConversations: input.supportsConversations,
    });
    if (!claimed.task) {
      return res.status(204).send();
    }
    res.locals.taskAuditTaskId = claimed.task.id;
    return res.send({ task: taskForClaim(claimed.task, claimed.leaseToken) });
  } catch (cause) {
    if (cause instanceof NexusTaskForbiddenError) return error(res, 403, 'Forbidden');
    next(cause);
  }
};

export const reportTaskResult: RequestHandler = async (req, res, next) => {
  const input = validateResultTaskBody(req.body);
  if (typeof input === 'string') {
    return error(res, 400, input);
  }
  if (!validTaskId(req.params.id)) {
    return error(res, 404, 'Task not found');
  }
  try {
    const reported = await reportNexusTaskResult({
      ...input,
      ownerChatId: String(res.locals.taskOwner.chatId),
      taskId: req.params.id,
    });
    return res.send({ task: taskForResult(reported.task) });
  } catch (cause) {
    if (cause instanceof NexusTaskValidationError) {
      return error(res, 400, cause.message);
    }
    if (cause instanceof NexusTaskNotFoundError) {
      return error(res, 404, 'Task not found');
    }
    if (cause instanceof NexusTaskForbiddenError) return error(res, 403, 'Forbidden');
    if (cause instanceof NexusTaskConflictError) {
      return error(res, 409, cause.message);
    }
    next(cause);
  }
};

export const getTask: RequestHandler = async (req, res, next) => {
  if (!validTaskId(req.params.id)) return error(res, 404, 'Task not found');
  try {
    const { task, attempts } = await getNexusTask(String(res.locals.taskOwner.chatId), req.params.id);
    return res.send({
      task: {
        ...taskForCreate(task),
        createdBy: task.createdBy,
        resultSummary: task.resultSummary,
        lastError: task.lastError,
        completedAt: task.completedAt?.toISOString() || null,
        attempts: attempts.map((attempt) => ({
          attempt: attempt.attempt,
          workerId: attempt.workerId,
          provider: attempt.provider,
          outcome: attempt.outcome,
          execution: attempt.execution,
          resultReceivedAt: attempt.resultReceivedAt?.toISOString() || null,
        })),
        usage: summarizeNexusTaskUsage(attempts),
      },
    });
  } catch (cause) {
    if (cause instanceof NexusTaskForbiddenError) return error(res, 403, 'Forbidden');
    if (cause instanceof NexusTaskNotFoundError) return error(res, 404, 'Task not found');
    next(cause);
  }
};

export type TaskHandlers = {
  get: RequestHandler;
  create: RequestHandler;
  claim: RequestHandler;
  result: RequestHandler;
};

export const createTaskRouter = (handlers: TaskHandlers): Router =>
  Router()
    .post('/', auditTaskRequest('create'), authenticate, handlers.create)
    .post('/claim', auditTaskRequest('claim'), authenticate, handlers.claim)
    .post('/:id/result', auditTaskRequest('result'), authenticate, handlers.result)
    .get('/:id', auditTaskRequest('get'), authenticate, handlers.get);

export default createTaskRouter({ get: getTask, create: createTask, claim: claimTask, result: reportTaskResult });
