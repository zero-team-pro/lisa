import { beforeEach, expect, jest, test } from '@jest/globals';

jest.mock('@/models', () => ({ sequelize: { query: jest.fn(), transaction: jest.fn() } }));
jest.mock('./nexusTaskAuthorization', () => ({ requireNexusTaskOwner: jest.fn() }));
jest.mock('./nexusFiles', () => ({ requireFileLease: jest.fn() }));
import { sequelize } from '@/models';
import { requireNexusTaskOwner } from './nexusTaskAuthorization';
import { requireFileLease } from './nexusFiles';
import { createReminder, ReminderValidationError } from './nexusReminders';

const id = '3c9ca2c5-a448-4b01-a5ac-482f1b7c0274';
const dueAt = '2099-01-01T00:00:00.000Z';
const tx = {};
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(requireNexusTaskOwner).mockResolvedValue({} as never);
  jest.mocked(sequelize.transaction).mockImplementation((async (fn: any) => fn(tx)) as any);
});
test('a task reminder records its source only after lease verification', async () => {
  jest
    .mocked(sequelize.query)
    .mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ id }] as never);
  jest
    .mocked(requireFileLease)
    .mockResolvedValue({ source: 'telegram', interaction: { sourceMessageId: 42 } } as never);
  await createReminder('123', { id, taskId: id, attempt: 1, leaseToken: 'lease', text: 'Пирог', dueAt });
  expect(requireFileLease).toHaveBeenCalledWith(expect.objectContaining({ ownerChatId: '123', taskId: id }), tx as any);
  expect(sequelize.query).toHaveBeenLastCalledWith(
    expect.stringContaining('INSERT INTO nexus_reminder'),
    expect.objectContaining({ replacements: expect.objectContaining({ messageId: 42, reactionState: 'pending' }) }),
  );
});
test('replaying the same request returns the saved reminder without inserting again', async () => {
  jest.mocked(sequelize.query).mockResolvedValueOnce([{ id, taskId: id, text: 'Пирог', dueAt }] as never);
  await createReminder('123', { id, taskId: id, text: 'Пирог', dueAt });
  expect(sequelize.query).toHaveBeenCalledTimes(1);
});
test('a new reminder in the past is rejected', async () => {
  jest.mocked(sequelize.query).mockResolvedValueOnce([] as never);
  await expect(createReminder('123', { id, text: 'Пирог', dueAt: '2020-01-01T00:00:00Z' })).rejects.toBeInstanceOf(
    ReminderValidationError,
  );
});
