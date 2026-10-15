import { beforeEach, expect, jest, test } from '@jest/globals';
jest.mock('@/models', () => ({ NexusTask: { findAll: jest.fn() }, NexusTaskNotification: { findAll: jest.fn() } }));
jest.mock('./nexusTaskAuthorization', () => ({ requireNexusTaskOwner: jest.fn() }));
jest.mock('./nexusChat', () => ({ isNexusChatConfigured: jest.fn().mockReturnValue(true) }));
import { NexusTask, NexusTaskNotification } from '@/models';
import { requireNexusTaskOwner } from './nexusTaskAuthorization';
import { tickNexusTyping } from './nexusTyping';
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requireNexusTaskOwner).mockResolvedValue({} as never);
  jest.mocked(NexusTaskNotification.findAll).mockResolvedValue([]);
});
test('restores typing from durable tasks and sends one action per chat', async () => {
  jest.mocked(NexusTask.findAll).mockResolvedValue([{ ownerChatId: '123' }, { ownerChatId: '123' }] as never);
  const bot = { telegram: { sendChatAction: jest.fn() } };
  await tickNexusTyping(bot as never);
  expect(bot.telegram.sendChatAction).toHaveBeenCalledTimes(1);
  expect(bot.telegram.sendChatAction).toHaveBeenCalledWith(123, 'typing');
});
test('role revocation stops typing and a completed queue has no typing', async () => {
  jest.mocked(NexusTask.findAll).mockResolvedValue([{ ownerChatId: '123' }] as never);
  jest.mocked(requireNexusTaskOwner).mockRejectedValue(new Error('Forbidden'));
  const bot = { telegram: { sendChatAction: jest.fn() } };
  await tickNexusTyping(bot as never);
  expect(bot.telegram.sendChatAction).not.toHaveBeenCalled();
  jest.mocked(NexusTask.findAll).mockResolvedValue([]);
  await tickNexusTyping(bot as never);
  expect(bot.telegram.sendChatAction).not.toHaveBeenCalled();
});
