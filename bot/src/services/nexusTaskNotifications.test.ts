import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('./nexusTaskAuthorization', () => ({
  requireNexusTaskOwner: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));
import { requireNexusTaskOwner } from './nexusTaskAuthorization';

jest.mock('@/models', () => ({
  NexusTaskNotification: { create: jest.fn(), findOne: jest.fn(), update: jest.fn() },
  sequelize: { transaction: jest.fn() },
}));
jest.mock('@/utils/bridgeRequest', () => ({ bridgeRequest: jest.fn() }));
jest.mock('@/utils/uuid', () => ({ uuid: () => 'event-id' }));
import { NexusTaskNotification, sequelize } from '@/models';
import { bridgeRequest } from '@/utils/bridgeRequest';
import {
  enqueueNexusTaskNotification,
  deliverNexusTaskNotification,
  flushNexusTaskNotifications,
  formatNexusTaskNotification,
} from './nexusTaskNotifications';

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(requireNexusTaskOwner).mockResolvedValue(undefined as never);
});

describe('Nexus task Telegram notifications', () => {
  test('keeps the task id visible and truncates long results within Telegram limits', () => {
    const task = {
      id: '00000000-0000-4000-8000-000000000001',
      status: 'completed',
      resultSummary: 'x'.repeat(10_000),
    } as any;

    const text = formatNexusTaskNotification(task);

    expect(text).toContain(`ID: ${task.id}`);
    expect(text.length).toBeLessThanOrEqual(4000);
    expect(text.endsWith('…')).toBe(true);
  });

  test('includes retry time and failure detail for scheduled retries', () => {
    const text = formatNexusTaskNotification({
      id: 'task-id',
      status: 'queued',
      availableAt: new Date('2026-07-17T10:05:00.000Z'),
      lastError: 'temporary network error',
    } as any);

    expect(text).toContain('Nexus task retry scheduled');
    expect(text).toContain('2026-07-17T10:05:00.000Z');
    expect(text).toContain('temporary network error');
  });
});

test('truncates without splitting an emoji surrogate pair', () => {
  const prefix = 'Nexus task completed\nID: task-id\n\n';
  const resultSummary = 'x'.repeat(3998 - prefix.length) + '😀' + 'x'.repeat(100);
  const text = formatNexusTaskNotification({ id: 'task-id', status: 'completed', resultSummary } as any);
  expect(text).toBe(prefix + 'x'.repeat(3998 - prefix.length) + '…');
});

describe('durable notification delivery', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const bridge = { isConnected: () => true } as any;
  const pending = () => ({
    id: 'event-id',
    taskId: 'task-id',
    ownerChatId: '123',
    text: 'a saved event snapshot',
    claimedUntil: null,
    save: jest.fn(),
  });
  beforeEach(() => {
    jest.mocked(sequelize.transaction).mockImplementation(async (callback: any) => callback(transaction));
  });

  test('leaves notifications pending when the bridge is unavailable', async () => {
    await flushNexusTaskNotifications({ isConnected: () => false } as any);
    expect(NexusTaskNotification.findOne).not.toHaveBeenCalled();
    expect(bridgeRequest).not.toHaveBeenCalled();
  });

  test('stores a snapshot with the state transition transaction', async () => {
    await enqueueNexusTaskNotification(
      { id: 'task-id', ownerChatId: '123', status: 'completed', resultSummary: 'done' } as any,
      transaction as any,
    );
    expect(NexusTaskNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'task-id', ownerChatId: '123', text: expect.stringContaining('done') }),
      { transaction: transaction as any },
    );
  });

  test('delivers a claimed snapshot and marks only that event delivered', async () => {
    const event = pending();
    jest
      .mocked(NexusTaskNotification.findOne)
      .mockResolvedValueOnce(event as never)
      .mockResolvedValue(null);
    jest.mocked(bridgeRequest).mockResolvedValue({ isSent: true, messageId: 42 });
    await flushNexusTaskNotifications(bridge);
    expect(bridgeRequest).toHaveBeenCalledWith(bridge, 'telegram', 'tg-notify', {
      chatId: 123,
      text: event.text,
      format: 'markdown',
    });
    expect(NexusTaskNotification.update).toHaveBeenCalledWith(
      { deliveredAt: expect.any(Date), claimedUntil: null },
      { where: { id: event.id, deliveredAt: null, claimedUntil: event.claimedUntil } },
    );
    expect(NexusTaskNotification.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: 'UPDATE', skipLocked: true }),
    );
  });

  test('keeps a failed delivery pending for a later retry without a Nexus callback', async () => {
    const event = pending();
    jest
      .mocked(NexusTaskNotification.findOne)
      .mockResolvedValueOnce(event as never)
      .mockResolvedValue(null);
    jest.mocked(bridgeRequest).mockResolvedValue({ isSent: false, messageId: null });
    await flushNexusTaskNotifications(bridge);
    expect(NexusTaskNotification.update).toHaveBeenCalledWith(
      { claimedUntil: expect.any(Date) },
      expect.objectContaining({ where: expect.objectContaining({ id: event.id, deliveredAt: null }) }),
    );
  });
});

test('keeps execution metadata visible even when the result is truncated', () => {
  const text = formatNexusTaskNotification(
    { id: 'task-id', status: 'completed', resultSummary: 'x'.repeat(10_000) } as any,
    false,
    {
      model: 'test-model',
      reasoningEffort: 'medium',
      inputTokens: 100,
      cachedInputTokens: 80,
      outputTokens: 20,
      durationMs: 1234,
      reasoningOutputTokens: null,
      reusedFromAttempt: null,
    },
  );
  expect(text.length).toBeLessThanOrEqual(4000);
  expect(text).toContain('Model: test-model (medium)');
  expect(text).toContain('Tokens: input 100, cached 80, output 20');
  expect(text).toContain('Duration: 1.2s');
});

test('does not send task content when the private owner loses globalAdmin authorization', async () => {
  jest.mocked(requireNexusTaskOwner).mockRejectedValueOnce(new Error('Forbidden'));
  await expect(
    deliverNexusTaskNotification(
      { isConnected: () => true } as any,
      { ownerChatId: '123', text: 'private task result', taskId: 'task-id' } as any,
    ),
  ).resolves.toBe(false);
  expect(bridgeRequest).not.toHaveBeenCalled();
});
