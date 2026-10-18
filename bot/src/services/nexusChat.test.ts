import { beforeEach, expect, jest, test } from '@jest/globals';
jest.mock('@/models', () => ({
  NexusChatMessage: { findOrCreate: jest.fn(), findAll: jest.fn(), destroy: jest.fn() },
  NexusTask: { findOne: jest.fn() },
  NexusTaskNotification: { findOne: jest.fn() },
}));
jest.mock('./nexusTaskAuthorization', () => ({
  requireNexusTaskOwner: jest.fn(),
  NexusTaskForbiddenError: class extends Error {},
}));
import { NexusChatMessage, NexusTask, NexusTaskNotification } from '@/models';
import { requireNexusTaskOwner } from './nexusTaskAuthorization';
import { boundNexusContext, nexusChatContext, nexusReplyTask, rememberNexusChatMessage } from './nexusChat';
import { Op } from 'sequelize';
beforeEach(() => {
  jest.resetAllMocks();
});

test('limits context to ten messages and 8000 characters, prioritizing recent messages', () => {
  const result = boundNexusContext(
    Array.from({ length: 20 }, (_, i) => ({ role: 'user' as const, text: String(i).repeat(1000) })),
  );
  expect(result.length).toBeLessThanOrEqual(10);
  expect(result.reduce((sum, item) => sum + item.text.length, 0)).toBe(8000);
  expect(result.at(-1)?.text).toBe('19'.repeat(1000));
});
test('denies history reads and reply lookups before querying stored content', async () => {
  jest.mocked(requireNexusTaskOwner).mockRejectedValue(new Error('Forbidden'));
  await expect(nexusChatContext('123', 42)).rejects.toThrow('Forbidden');
  await expect(nexusReplyTask('123', 41)).rejects.toThrow('Forbidden');
  expect(NexusChatMessage.findAll).not.toHaveBeenCalled();
  expect(NexusTaskNotification.findOne).not.toHaveBeenCalled();
});
test('uses only recent owner-scoped messages preceding the current Telegram message', async () => {
  jest.mocked(NexusChatMessage.findAll).mockResolvedValue([{ role: 'assistant', text: 'older answer' }] as never);
  expect(await nexusChatContext('123', 42, { content: 'quoted warning', isSelf: true })).toEqual([
    { role: 'assistant', text: 'older answer' },
    { role: 'assistant', text: 'quoted warning' },
  ]);
  expect(NexusChatMessage.findAll).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        ownerChatId: '123',
        messageId: { [Op.lt]: 42 },
        createdAt: { [Op.gte]: expect.any(Date) },
      }),
      limit: 10,
    }),
  );
});
test('binds reply IDs to the same owner and a completed task', async () => {
  jest.mocked(NexusTaskNotification.findOne).mockResolvedValue({ taskId: 'parent' } as never);
  await nexusReplyTask('123', 50);
  expect(NexusTaskNotification.findOne).toHaveBeenCalledWith({
    where: { ownerChatId: '123', messageIds: { [Op.contains]: [50] } },
  });
  expect(NexusTask.findOne).toHaveBeenCalledWith({
    where: { id: 'parent', ownerChatId: '123', status: 'completed', operation: null },
  });
});
test('never retains command secrets or messages from unconfigured chats', async () => {
  await rememberNexusChatMessage('123', 40, 'user', '/linkMe secret');
  await rememberNexusChatMessage('-100', 41, 'user', 'private content');
  expect(NexusChatMessage.findOrCreate).not.toHaveBeenCalled();
});

test('context bounds never leave an unpaired emoji surrogate in PostgreSQL JSON', () => {
  const result = boundNexusContext([{ role: 'user', text: 'x'.repeat(7999) + '😀more' }]);
  expect(result[0].text).toBe('x'.repeat(7999));
});
