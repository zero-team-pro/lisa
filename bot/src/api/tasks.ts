import { createReminder, ReminderValidationError } from '@/services/nexusReminders';
import { sequelize } from '@/models';
import { QueryTypes } from 'sequelize';
import {
  nexusFileHealth,
  taskFileDeliveryState,
  NexusFileError,
  stageNexusFile,
  readTaskNexusFile,
  requireFileLease,
  taskFileManifest,
  validateFileIds,
  NEXUS_FILE_DEFAULT_TEXT,
  NEXUS_FILE_LIMITS,
  isFileUuid,
} from '@/services/nexusFiles';
import { waitForNexusTask } from '@/services/nexusTaskWait';
import { raw } from 'express';
import { requireVideoTask, SEND_VIDEO_MAX_BYTES } from '@/services/nexusTaskVideo';
import { bridgeRequest } from '@/utils/bridgeRequest';
import { validateOperation, validateCaptureResult, validateOperationCapabilities } from '@/services/nexusTaskRouting';
import type { NexusTaskOperation } from '@/services/nexusTaskRouting';
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

const taskForCreate = async (task: NexusTask) => ({
  attachments: await taskFileManifest(task.id),
  artifacts: await taskFileManifest(task.id, 'output'),
  id: task.id,
  text: task.text,
  source: task.source,
  interaction: task.interaction || null,
  operation: task.operation || null,
  status: task.status,
  attemptCount: task.attemptCount,
  maxAttempts: task.maxAttempts,
  availableAt: task.availableAt?.toISOString() || null,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
});

const taskForClaim = async (task: NexusTask, leaseToken: string) => ({
  attachments: await taskFileManifest(task.id),
  id: task.id,
  text: task.text,
  source: task.source,
  interaction: task.interaction || null,
  operation: task.operation || null,
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
      if (operation.startsWith('file-') || operation === 'artifact-upload') {
        if (isFileUuid(req.params.fileId || req.params.artifactId))
          payload.fileId = req.params.fileId || req.params.artifactId;
        const size = Number(req.get('content-length'));
        if (Number.isSafeInteger(size) && size >= 0) payload.sizeBytes = size;
        const hash = req.get('x-nexus-sha256');
        if (hash && /^[0-9a-f]{64}$/.test(hash)) payload.sha256 = hash;
      }
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

export const validateCreateTaskBody = (
  body: unknown,
):
  | { text: string; attachmentIds?: string[]; clientRequestId: string | null; operation?: NexusTaskOperation | null }
  | string => {
  const value = body as Record<string, unknown>;
  let attachmentIds: string[];
  try {
    attachmentIds = validateFileIds(value?.attachmentIds);
  } catch {
    return 'attachmentIds must contain at most 10 unique UUIDs';
  }
  if (
    !value ||
    (value.text !== undefined && typeof value.text !== 'string') ||
    (!(typeof value.text === 'string' && value.text.trim()) && !attachmentIds.length)
  ) {
    return 'text must be a non-empty string';
  }
  const text = (typeof value.text === 'string' ? value.text.trim() : '') || NEXUS_FILE_DEFAULT_TEXT;
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
  let operation: NexusTaskOperation | null;
  try {
    operation = validateOperation(value.operation);
  } catch (cause) {
    return cause.message;
  }
  return {
    text,
    ...(attachmentIds.length ? { attachmentIds } : {}),
    clientRequestId: (value.clientRequestId as string | undefined) || null,
    ...(operation ? { operation } : {}),
  };
};

export const validateClaimTaskBody = (
  body: unknown,
):
  | { workerId: string; waitSeconds?: number; supportsConversations?: boolean; supportedOperations?: string[] }
  | string => {
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
  if (
    value.waitSeconds !== undefined &&
    (!Number.isInteger(value.waitSeconds) || Number(value.waitSeconds) < 0 || Number(value.waitSeconds) > 25)
  )
    return 'waitSeconds must be an integer from 0 to 25';
  if (value.supportsConversations !== undefined && typeof value.supportsConversations !== 'boolean')
    return 'supportsConversations must be boolean';
  try {
    validateOperationCapabilities(value.supportedOperations);
    validateOperationCapabilities(value.optionalSupportedOperations);
  } catch (cause) {
    return cause.message;
  }
  return {
    workerId: value.workerId.trim(),
    ...(value.waitSeconds === undefined ? {} : { waitSeconds: value.waitSeconds as number }),
    ...(value.supportedOperations === undefined && value.optionalSupportedOperations === undefined
      ? {}
      : {
          supportedOperations: [
            ...new Set([
              ...((value.supportedOperations as string[]) || []),
              ...((value.optionalSupportedOperations as string[]) || []),
            ]),
          ],
        }),
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

  let artifacts: string[];
  try {
    artifacts = validateFileIds(value.artifacts);
  } catch {
    return 'artifacts must contain at most 10 unique UUIDs';
  }
  if (artifacts.length && value.outcome !== 'completed') return 'artifacts require completed outcome';
  const execution = validateTaskExecution(value.execution, value.attempt as number);
  if (typeof execution === 'string') return execution;
  if (value.capture !== undefined && value.capture !== null) {
    try {
      validateCaptureResult(value.capture, value.outcome as string);
    } catch (cause) {
      return cause.message;
    }
    if (value.provider !== 'local' || execution) return 'capture requires local provider and no AI execution';
  }

  return {
    execution,
    ...(artifacts.length ? { artifacts } : {}),
    ...(value.capture ? { capture: validateCaptureResult(value.capture, value.outcome as string) } : {}),
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
      ...(input.attachmentIds ? { attachmentIds: input.attachmentIds } : {}),
      source: 'api',
      clientRequestId: input.clientRequestId,
      ...(input.operation ? { operation: input.operation } : {}),
      createdBy: res.locals.taskActor,
    });
    res.locals.taskAuditTaskId = task.id;
    return res.status(created ? 201 : 200).send({ task: await taskForCreate(task) });
  } catch (cause) {
    if (cause instanceof NexusFileError) return error(res, cause.status, cause.message);
    if (cause instanceof NexusTaskValidationError) return error(res, 400, cause.message);
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
    if (input.waitSeconds) res.set('X-Nexus-Long-Poll', '1');
    const controller = new AbortController();
    const disconnected = () => controller.abort();
    res.once('close', disconnected);
    let claimed;
    try {
      claimed = await waitForNexusTask({
        ownerChatId: String(res.locals.taskOwner.chatId),
        waitSeconds: input.waitSeconds || 0,
        signal: controller.signal,
        claim: () =>
          claimNexusTask({
            ownerChatId: String(res.locals.taskOwner.chatId),
            workerId: input.workerId,
            supportsConversations: input.supportsConversations,
            ...(input.supportedOperations === undefined ? {} : { supportedOperations: input.supportedOperations }),
          }),
        hasTask: (result) => Boolean(result.task),
      });
    } finally {
      res.removeListener('close', disconnected);
    }
    if (!claimed || res.destroyed) return;
    if (!claimed.task) {
      return res.status(204).send();
    }
    res.locals.taskAuditTaskId = claimed.task.id;
    return res.send({ task: await taskForClaim(claimed.task, claimed.leaseToken) });
  } catch (cause) {
    if (cause instanceof NexusFileError) return error(res, cause.status, cause.message);
    if (cause instanceof NexusTaskValidationError) return error(res, 400, cause.message);
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
    if (cause instanceof NexusFileError) return error(res, cause.status, cause.message);
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
        ...(await taskForCreate(task)),
        createdBy: task.createdBy,
        resultSummary: task.resultSummary,
        delivery: await taskFileDeliveryState(task.id),
        capture: task.capture || null,
        lastError: task.lastError,
        completedAt: task.completedAt?.toISOString() || null,
        attempts: attempts.map((attempt) => ({
          attempt: attempt.attempt,
          workerId: attempt.workerId,
          provider: attempt.provider,
          outcome: attempt.outcome,
          execution: attempt.execution,
          capture: attempt.capture || null,
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

export const videoTask: RequestHandler = async (req, res, next) => {
  if (!validTaskId(req.params.id)) return error(res, 404, 'Task not found');
  const leaseToken = req.get('x-nexus-lease') || '';
  const attempt = Number(req.get('x-nexus-attempt'));
  if (!leaseToken || leaseToken.length > 200 || !Number.isSafeInteger(attempt) || attempt < 1)
    return error(res, 400, 'Expected video lease headers');
  const input = { ownerChatId: String(res.locals.taskOwner.chatId), taskId: req.params.id, leaseToken, attempt };
  try {
    const task = await requireVideoTask(input);
    const state = ['sent', 'sending'].includes(task.capture?.state) ? task.capture.state : 'none';
    if (req.method === 'GET' || state !== 'none') return res.send({ state });
    if (!Buffer.isBuffer(req.body) || !req.body.length || req.body.length > SEND_VIDEO_MAX_BYTES)
      return error(res, 400, 'Expected a bounded video/mp4 body');
    const result = await bridgeRequest<{ state: string }>(
      req.app.settings.bridge,
      'telegram',
      'tg-nexus-video',
      {
        ...input,
        video: req.body.toString('base64'),
      },
      180_000,
    );
    return res.send({ state: result.state });
  } catch (cause) {
    if (cause instanceof NexusFileError) return error(res, cause.status, cause.message);
    if (cause instanceof NexusTaskValidationError) return error(res, 400, cause.message);
    if (cause instanceof NexusTaskNotFoundError) return error(res, 404, 'Task not found');
    if (cause instanceof NexusTaskForbiddenError) return error(res, 403, 'Forbidden');
    if (cause instanceof NexusTaskConflictError) return error(res, 409, cause.message);
    next(cause);
  }
};

const fileLeaseHeaders = (req: Parameters<RequestHandler>[0], ownerChatId: string) => {
  const leaseToken = req.get('x-nexus-lease') || '';
  const attempt = Number(req.get('x-nexus-attempt'));
  if (!leaseToken || leaseToken.length > 200 || !Number.isSafeInteger(attempt) || attempt < 1)
    throw new NexusFileError(400, 'Expected active lease headers');
  return { ownerChatId, taskId: req.params.id, leaseToken, attempt };
};
export const uploadTaskFile: RequestHandler = async (req, res, next) => {
  try {
    const ownerChatId = String(res.locals.taskOwner.chatId);
    const lease = req.params.id ? fileLeaseHeaders(req, ownerChatId) : null;
    if (lease) await requireFileLease(lease);
    if (req.params.artifactId && !isFileUuid(req.params.artifactId))
      throw new NexusFileError(404, 'Artifact not found');
    if (req.get('content-type') !== 'application/octet-stream')
      throw new NexusFileError(415, 'Expected application/octet-stream');
    const length = req.get('content-length');
    if (length && (!/^\d+$/.test(length) || Number(length) > NEXUS_FILE_LIMITS.bytes))
      throw new NexusFileError(413, 'File exceeds byte limit');
    let name: string;
    try {
      name = decodeURIComponent(req.get('x-nexus-filename') || '');
    } catch {
      throw new NexusFileError(400, 'Invalid file name encoding');
    }
    const file = await stageNexusFile(
      {
        ownerChatId,
        name,
        declaredMime: req.get('x-nexus-mime-type') || 'application/octet-stream',
        source: lease ? 'generated' : 'api',
        ...(lease ? { taskId: lease.taskId, attempt: lease.attempt, leaseToken: lease.leaseToken } : {}),
        ...(req.params.artifactId ? { fileId: req.params.artifactId } : {}),
        expectedSha256: req.get('x-nexus-sha256'),
      },
      req,
    );
    return res.status(201).send({ file });
  } catch (cause) {
    if (cause instanceof NexusFileError) return error(res, cause.status, cause.message);
    if (cause instanceof NexusTaskForbiddenError) return error(res, 403, 'Forbidden');
    next(cause);
  }
};
export const downloadTaskFile: RequestHandler = async (req, res, next) => {
  try {
    if (!isFileUuid(req.params.fileId)) return error(res, 404, 'File not found');
    const result = await readTaskNexusFile({
      ...fileLeaseHeaders(req, String(res.locals.taskOwner.chatId)),
      fileId: req.params.fileId,
    });
    res.set('Content-Type', 'application/octet-stream');
    res.set(
      'Content-Disposition',
      `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(result.file.name)}`,
    );
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store');
    return res.send(result.bytes);
  } catch (cause) {
    if (cause instanceof NexusFileError) return error(res, cause.status, cause.message);
    if (cause instanceof NexusTaskForbiddenError) return error(res, 403, 'Forbidden');
    next(cause);
  }
};

export type TaskHandlers = {
  get: RequestHandler;
  create: RequestHandler;
  claim: RequestHandler;
  result: RequestHandler;
  video: RequestHandler;
};

export const createTaskRouter = (handlers: TaskHandlers): Router =>
  Router()
    .get('/files/health', auditTaskRequest('file-health'), authenticate, async (_req, res, next) => {
      try {
        res.send(await nexusFileHealth());
      } catch (cause) {
        next(cause);
      }
    })
    .post('/files', auditTaskRequest('file-upload'), authenticate, uploadTaskFile)
    .post('/:id/artifacts/:artifactId', auditTaskRequest('artifact-upload'), authenticate, uploadTaskFile)
    .get('/:id/files/:fileId', auditTaskRequest('file-download'), authenticate, downloadTaskFile)
    .post('/reminders', auditTaskRequest('reminder-create'), authenticate, async (req, res, next) => {
      try {
        const b = req.body || {};
        const reminder = await createReminder(String(res.locals.taskOwner.chatId), {
          id: b.id,
          text: b.text,
          dueAt: b.dueAt,
          ...(b.taskId ? { taskId: b.taskId, leaseToken: b.leaseToken, attempt: b.attempt } : {}),
        });
        res.status(201).send({ reminder });
      } catch (cause) {
        if (cause instanceof NexusTaskForbiddenError) return error(res, 403, 'Forbidden');
        if (cause instanceof NexusFileError) return error(res, cause.status, cause.message);
        if (cause instanceof ReminderValidationError) return error(res, 400, 'Could not create reminder');
        return next(cause);
      }
    })
    .get('/reminders', auditTaskRequest('reminder-list'), authenticate, async (_req, res, next) => {
      try {
        const reminders = await sequelize.query(
          'SELECT id,text,"dueAt",state FROM nexus_reminder WHERE "ownerChatId"=:owner AND state IN (\'pending\',\'sending\',\'uncertain\') ORDER BY "dueAt" LIMIT 100',
          { replacements: { owner: String(res.locals.taskOwner.chatId) }, type: QueryTypes.SELECT },
        );
        res.send({ reminders });
      } catch (cause) {
        next(cause);
      }
    })
    .post(
      '/reminders/:reminderId/cancel',
      auditTaskRequest('reminder-cancel'),
      authenticate,
      async (req, res, next) => {
        if (!validTaskId(req.params.reminderId)) return error(res, 400, 'Invalid reminder id');
        try {
          const rows = await sequelize.query(
            `UPDATE nexus_reminder SET state='cancelled', "updatedAt"=now() WHERE id=:id AND "ownerChatId"=:owner AND state='pending' RETURNING id`,
            {
              replacements: { id: req.params.reminderId, owner: String(res.locals.taskOwner.chatId) },
              type: QueryTypes.SELECT,
            },
          );
          return rows.length ? res.send({ cancelled: true }) : error(res, 409, 'Reminder not pending');
        } catch (cause) {
          next(cause);
        }
      },
    )
    .post('/', auditTaskRequest('create'), authenticate, handlers.create)
    .post('/claim', auditTaskRequest('claim'), authenticate, handlers.claim)
    .post('/:id/result', auditTaskRequest('result'), authenticate, handlers.result)
    .get('/:id/video', auditTaskRequest('video'), authenticate, handlers.video)
    .post(
      '/:id/video',
      auditTaskRequest('video'),
      authenticate,
      raw({ type: 'video/mp4', limit: SEND_VIDEO_MAX_BYTES }),
      handlers.video,
    )
    .get('/:id', auditTaskRequest('get'), authenticate, handlers.get);

export default createTaskRouter({
  get: getTask,
  create: createTask,
  claim: claimTask,
  result: reportTaskResult,
  video: videoTask,
});
