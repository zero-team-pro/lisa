import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/models', () => ({ AdminUser: {}, TelegramUser: { findByPk: jest.fn() } }));
import { AdminUser, TelegramUser } from '@/models';
import { isAuthorizedTaskCreator, NexusTaskForbiddenError, requireNexusTaskOwner } from './nexusTaskAuthorization';

beforeEach(() => jest.resetAllMocks());

describe('private globalAdmin task authorization', () => {
  test.each(['-100123', '0', '', 'abc', '1e3', '00123', '9007199254740992'])(
    'rejects shared or invalid chat ID %j without a lookup',
    async (chatId) => {
      await expect(requireNexusTaskOwner(chatId)).rejects.toBeInstanceOf(NexusTaskForbiddenError);
      expect(TelegramUser.findByPk).not.toHaveBeenCalled();
    },
  );
  test.each([null, {}, { admin: null }, { admin: { id: 9, role: 'user' } }, { admin: { id: 9, role: 'admin' } }])(
    'denies an unlinked or non-global administrator: %j',
    async (user) => {
      jest.mocked(TelegramUser.findByPk).mockResolvedValue(user as never);
      await expect(requireNexusTaskOwner('123')).rejects.toBeInstanceOf(NexusTaskForbiddenError);
    },
  );
  test('looks up the private owner and current database role on every call', async () => {
    const admin = { id: 9, role: 'globalAdmin' };
    jest
      .mocked(TelegramUser.findByPk)
      .mockResolvedValueOnce({ admin } as never)
      .mockResolvedValueOnce({ admin: { ...admin, role: 'user' } } as never);
    await expect(requireNexusTaskOwner('123')).resolves.toBe(admin);
    await expect(requireNexusTaskOwner('123')).rejects.toBeInstanceOf(NexusTaskForbiddenError);
    expect(TelegramUser.findByPk).toHaveBeenCalledTimes(2);
    expect(TelegramUser.findByPk).toHaveBeenCalledWith('123', { include: [AdminUser] });
  });
  test('never turns a database failure into authorization', async () => {
    jest.mocked(TelegramUser.findByPk).mockRejectedValue(new Error('database unavailable'));
    await expect(requireNexusTaskOwner('123')).rejects.toThrow('database unavailable');
  });
  test('binds task creator identity to the current globalAdmin and private owner', () => {
    expect(isAuthorizedTaskCreator(null, '123', 9)).toBe(false);
    expect(isAuthorizedTaskCreator({ type: 'telegram', telegramUserId: '123', adminUserId: 9 }, '123', 9)).toBe(true);
    expect(isAuthorizedTaskCreator({ type: 'telegram', telegramUserId: '456', adminUserId: 9 }, '123', 9)).toBe(false);
    expect(isAuthorizedTaskCreator({ type: 'telegram', telegramUserId: '123', adminUserId: 10 }, '123', 9)).toBe(false);
    expect(isAuthorizedTaskCreator({ type: 'api', apiTokenHash: 'a'.repeat(64), adminUserId: 9 }, '123', 9)).toBe(true);
    expect(isAuthorizedTaskCreator({ type: 'api', apiTokenHash: 'raw-token', adminUserId: 9 }, '123', 9)).toBe(false);
  });
});
