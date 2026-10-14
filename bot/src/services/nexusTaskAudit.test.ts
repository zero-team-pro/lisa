import { describe, expect, jest, test } from '@jest/globals';

jest.mock('@/models', () => ({ NexusTaskRequest: { create: jest.fn(), update: jest.fn() } }));
jest.mock('@/utils/uuid', () => ({ uuid: () => 'request-id' }));
import { NexusTaskRequest } from '@/models';
import { beginTaskRequest, finishTaskRequest, taskApiActor, taskAuditPayload } from './nexusTaskAudit';

describe('task request audit', () => {
  test('identifies API credentials by fingerprint, never by the secret', () => {
    const actor = taskApiActor('a-secret-token');
    expect(actor.apiTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(actor)).not.toContain('a-secret-token');
    expect(taskApiActor('a-secret-token')).toEqual(actor);
    expect(taskApiActor('different-token')).not.toEqual(actor);
    expect(taskApiActor()).toEqual({ type: 'api', apiTokenHash: null });
  });

  test('stores only whitelisted scalar fields and excludes credential/nested injection', () => {
    expect(
      taskAuditPayload({
        text: 'work',
        attempt: 2,
        leaseToken: 'lease-secret',
        authorization: 'Bearer secret',
        chatId: 456,
        provider: { token: 'secret' },
      }),
    ).toEqual({ text: 'work', attempt: 2 });
    expect(taskAuditPayload(null)).toEqual({});
    expect(taskAuditPayload([])).toEqual({});
  });

  test('persists actor, request and response linkage independently of task existence', async () => {
    const actor = { type: 'telegram' as const, telegramUserId: '777', adminUserId: 9 };
    await beginTaskRequest('create', '123', actor, { text: 'work' });
    expect(NexusTaskRequest.create).toHaveBeenCalledWith({
      id: 'request-id',
      operation: 'create',
      ownerChatId: '123',
      actor,
      payload: { text: 'work' },
    });
    await finishTaskRequest('request-id', 403);
    expect(NexusTaskRequest.update).toHaveBeenCalledWith(
      { responseStatus: 403, taskId: null },
      { where: { id: 'request-id' } },
    );
  });
});
