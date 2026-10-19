import { beforeEach, expect, jest, test } from '@jest/globals';
import { createHash } from 'node:crypto';
jest.mock('@/models', () => ({
  NexusTask: { findOne: jest.fn(), update: jest.fn() },
  sequelize: { transaction: jest.fn() },
}));
jest.mock('./nexusTaskAuthorization', () => ({
  requireNexusTaskOwner: jest.fn(),
  isAuthorizedTaskCreator: jest.fn(),
  NexusTaskForbiddenError: class extends Error {},
}));
jest.mock('./nexusTasks', () => ({
  NexusTaskConflictError: class extends Error {},
  NexusTaskNotFoundError: class extends Error {},
  NexusTaskValidationError: class extends Error {},
}));
import { NexusTask, sequelize } from '@/models';
import { requireNexusTaskOwner, isAuthorizedTaskCreator } from './nexusTaskAuthorization';
import { deliverNexusVideo, requireVideoTask } from './nexusTaskVideo';
const input = {
  ownerChatId: '123',
  taskId: 'task',
  leaseToken: 'lease',
  attempt: 1,
  video: Buffer.from('\0\0\0\x18ftypmp42').toString('base64'),
};
let task: any;
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(requireNexusTaskOwner).mockResolvedValue({ id: 9 } as never);
  jest.mocked(isAuthorizedTaskCreator).mockReturnValue(true);
  jest.mocked(sequelize.transaction).mockImplementation(async (fn: any) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  task = {
    status: 'leased',
    attemptCount: 1,
    leaseTokenHash: createHash('sha256').update('lease').digest('hex'),
    leaseExpiresAt: new Date(Date.now() + 600_000),
    interaction: { sourceMessageId: 42 },
    operation: { kind: 'tiktok.send', version: 1, routingVersion: 1, url: 'https://vt.tiktok.com/TEST/', note: '' },
    capture: null,
    save: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
  jest.mocked(NexusTask.findOne).mockImplementation(async () => task);
  jest.mocked(NexusTask.update).mockImplementation(async (values: any) => {
    Object.assign(task, values);
    return [1] as never;
  });
});
test('sends only a video replying to the original message; replay does not send twice', async () => {
  const sendVideo = jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ message_id: 99 });
  const bot = { telegram: { sendVideo } } as any;
  await expect(deliverNexusVideo(input, bot)).resolves.toEqual({ state: 'sent' });
  expect(sendVideo).toHaveBeenCalledWith(
    '123',
    { source: Buffer.from(input.video, 'base64'), filename: 'video.mp4' },
    {
      supports_streaming: true,
      reply_parameters: { message_id: 42 },
    },
  );
  expect(task.save).toHaveBeenCalled();
  await expect(deliverNexusVideo(input, bot)).resolves.toEqual({ state: 'sent' });
  expect(sendVideo).toHaveBeenCalledTimes(1);
});
test('uncertain external delivery keeps a committed reservation and never resends', async () => {
  const sendVideo = jest.fn<() => Promise<any>>().mockRejectedValue(new Error('lost Telegram response'));
  const bot = { telegram: { sendVideo } } as any;
  await expect(deliverNexusVideo(input, bot)).rejects.toThrow();
  expect(task.capture.state).toBe('sending');
  await expect(deliverNexusVideo(input, bot)).resolves.toEqual({ state: 'sending' });
  expect(sendVideo).toHaveBeenCalledTimes(1);
});
test('role revocation, changed creator, stale/wrong lease and wrong operation prevent delivery', async () => {
  const bot = { telegram: { sendVideo: jest.fn() } } as any;
  jest.mocked(requireNexusTaskOwner).mockRejectedValueOnce(new Error('Forbidden'));
  await expect(deliverNexusVideo(input, bot)).rejects.toThrow();
  jest.mocked(isAuthorizedTaskCreator).mockReturnValueOnce(false);
  await expect(deliverNexusVideo(input, bot)).rejects.toThrow();
  for (const changes of [
    { status: 'completed' },
    { attemptCount: 2 },
    { leaseExpiresAt: new Date(0) },
    { leaseTokenHash: 'bad' },
    { operation: { ...task.operation, kind: 'tiktok.capture' } },
    { interaction: null },
  ]) {
    const original = task;
    task = { ...task, ...changes };
    await expect(deliverNexusVideo(input, bot)).rejects.toThrow();
    task = original;
  }
  expect(bot.telegram.sendVideo).not.toHaveBeenCalled();
});
test('owner scoping is part of the query and invalid MP4 never reaches Telegram', async () => {
  await requireVideoTask(input);
  expect(NexusTask.findOne).toHaveBeenCalledWith({ where: { id: 'task', ownerChatId: '123' } });
  const bot = { telegram: { sendVideo: jest.fn() } } as any;
  await expect(
    deliverNexusVideo({ ...input, video: Buffer.from('not video').toString('base64') }, bot),
  ).rejects.toThrow();
  expect(bot.telegram.sendVideo).not.toHaveBeenCalled();
});
