import { createHash } from 'node:crypto';
import { NexusTaskRequest } from '@/models';
import type { NexusTaskActor } from '@/models/nexusTaskRequest';
import { validateOperation, validateCaptureResult } from './nexusTaskRouting';
import { uuid } from '@/utils/uuid';

export const taskApiActor = (token?: string): NexusTaskActor => ({
  type: 'api',
  apiTokenHash: token ? createHash('sha256').update(token).digest('hex') : null,
});

// Whitelist scalar request fields. Never persist bearer/lease tokens or a raw
// request object; unknown body fields cannot smuggle credentials into the audit.
export const taskAuditPayload = (body: unknown): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return payload;
  for (const key of [
    'text',
    'clientRequestId',
    'workerId',
    'leaseSeconds',
    'outcome',
    'attempt',
    'provider',
    'summary',
    'error',
    'retryable',
    'retryAt',
  ]) {
    const value = body[key];
    if (typeof value === 'string') payload[key] = value.slice(0, key === 'text' ? 10_000 : 4_000);
    else if (value === null || ['number', 'boolean'].includes(typeof value)) payload[key] = value;
  }
  const execution = (body as Record<string, unknown>).execution;
  if (execution && typeof execution === 'object' && !Array.isArray(execution)) {
    const fields = {};
    for (const key of [
      'model',
      'reasoningEffort',
      'inputTokens',
      'cachedInputTokens',
      'outputTokens',
      'reasoningOutputTokens',
      'durationMs',
      'reusedFromAttempt',
    ]) {
      const value = execution[key];
      if (typeof value === 'string') fields[key] = value.slice(0, 100);
      else if (value === null || typeof value === 'number') fields[key] = value;
    }
    payload.execution = fields;
  }
  try {
    const operation = validateOperation((body as Record<string, unknown>).operation);
    if (operation) payload.operation = operation;
  } catch {
    payload.operationRejected = true;
  }
  try {
    if ((body as Record<string, unknown>).capture)
      payload.capture = validateCaptureResult(
        (body as Record<string, unknown>).capture,
        String((body as Record<string, unknown>).outcome),
      );
  } catch {
    payload.captureRejected = true;
  }

  return payload;
};

export const beginTaskRequest = (
  operation: string,
  ownerChatId: string | null,
  actor: NexusTaskActor,
  payload: Record<string, unknown>,
) => NexusTaskRequest.create({ id: uuid(), operation, ownerChatId, actor, payload });

export const finishTaskRequest = (
  id: string,
  responseStatus: number,
  taskId: string | null = null,
  actor?: NexusTaskActor,
) => NexusTaskRequest.update({ responseStatus, taskId, ...(actor ? { actor } : {}) }, { where: { id } });
