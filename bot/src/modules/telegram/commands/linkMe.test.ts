import { beforeEach, expect, jest, test } from '@jest/globals';

jest.mock('@/models', () => ({ AdminUser: { findByPk: jest.fn() }, TelegramUser: { findOrCreate: jest.fn() } }));
jest.mock('@/controllers/s3', () => ({
  S3Cloud: { uploadTelegramAvatar: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([null, null]) },
}));
jest.mock('@/utils', () => ({ getLanguageFromTelegram: () => 'en' }));
import { AdminUser, TelegramUser } from '@/models';
import { linkMe } from './linkMe';

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(AdminUser.findByPk).mockResolvedValue({ id: 9 } as never);
  jest.mocked(TelegramUser.findOrCreate).mockResolvedValue([{ adminId: 9, username: 'fixture' }, true] as never);
});

const message = (id: string, redis: unknown) =>
  ({
    content: '/linkMe fixture-token',
    fromId: id,
    chatId: id,
    isGroup: false,
    redis,
    raw: { from: { id: Number(id), username: 'fixture' }, telegram: {} },
    reply: jest.fn(),
  }) as any;

test('a one-time AdminUser link token cannot authorize two concurrent senders', async () => {
  let available = true;
  const redis = {
    getDel: jest.fn(async (_key: string) => {
      if (!available) return null;
      available = false;
      return '9';
    }),
  };
  const first = message('123', redis);
  const second = message('456', redis);
  await Promise.all([linkMe.exec(first), linkMe.exec(second)]);
  expect(TelegramUser.findOrCreate).toHaveBeenCalledTimes(1);
  expect(second.reply).toHaveBeenCalledWith('Token is not valid.');
  expect(redis.getDel).toHaveBeenCalledWith('linkMe:fixture-token');
});

test('does not link accounts from a shared chat or anonymous sender', async () => {
  const redis = { getDel: jest.fn() };
  await linkMe.exec({ ...message('123', redis), chatId: '-100123', isGroup: true });
  await linkMe.exec({ ...message('123', redis), raw: { message: { sender_chat: { id: '-100123' } } } });
  expect(redis.getDel).not.toHaveBeenCalled();
  expect(TelegramUser.findOrCreate).not.toHaveBeenCalled();
});
