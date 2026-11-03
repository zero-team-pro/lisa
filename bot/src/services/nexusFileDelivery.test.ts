jest.mock('@/messages/sources', () => ({ normalizeMessage: async () => ({ runs: [{ text: 'result', marks: {} }] }) }));
import { beforeEach, expect, jest, test } from '@jest/globals';
jest.mock('@/models', () => ({
  NexusTaskNotification: { findOne: jest.fn(), update: jest.fn(), findAll: jest.fn() },
  sequelize: { transaction: jest.fn(), query: jest.fn(), fn: jest.fn(), col: jest.fn() },
}));
jest.mock('./nexusTaskAuthorization', () => ({ requireNexusTaskOwner: jest.fn() }));
jest.mock('./nexusFiles', () => ({ readNexusFile: jest.fn() }));
jest.mock('./nexusChat', () => ({ rememberNexusChatMessage: jest.fn() }));
import { NexusTaskNotification, sequelize } from '@/models';
import { requireNexusTaskOwner } from './nexusTaskAuthorization';
import { readNexusFile } from './nexusFiles';
import { deliverNexusFiles } from './nexusFileDelivery';
const rows = new Map<number, any>();
beforeEach(() => {
  jest.clearAllMocks();
  rows.clear();
  jest.mocked(requireNexusTaskOwner).mockResolvedValue(undefined as never);
  jest
    .mocked(NexusTaskNotification.findOne)
    .mockResolvedValue({ id: 'event', ownerChatId: '123', text: 'result', replyToMessageId: 7 } as never);
  jest.mocked(sequelize.transaction).mockImplementation(async (callback: any) => callback({}));
  jest
    .mocked(readNexusFile)
    .mockResolvedValue({ bytes: Buffer.from('artifact'), file: { name: 'result.txt' } } as never);
  jest.mocked(sequelize.query).mockImplementation(async (sql: any, options: any) => {
    const p = options.replacements;
    if (sql.startsWith('INSERT')) {
      if (!rows.has(p.ordinal))
        rows.set(p.ordinal, { ordinal: p.ordinal, fileId: null, state: 'pending', telegramMessageId: null });
      return [] as any;
    }
    if (sql.startsWith('SELECT') && sql.includes('"fileId" IS NOT NULL'))
      return [...rows.values()].filter((row) => row.fileId) as any;
    if (sql.startsWith('SELECT')) return [rows.get(p.ordinal)] as any;
    if (sql.includes("SET state='sending'")) rows.get(p.ordinal).state = 'sending';
    if (sql.includes("SET state='uncertain'")) rows.get(p.ordinal).state = 'uncertain';
    if (sql.includes("SET state='sent'"))
      Object.assign(rows.get(p.ordinal), { state: 'sent', telegramMessageId: p.messageId });
    if (sql.includes('SET state=:state')) rows.get(p.ordinal).state = p.state;
    return [] as any;
  });
});
test('revoked role prevents all Telegram sends', async () => {
  jest.mocked(requireNexusTaskOwner).mockRejectedValueOnce(new Error('revoked'));
  const bot = { telegram: { sendMessage: jest.fn(), sendDocument: jest.fn() } } as any;
  await expect(deliverNexusFiles('event', '123', bot)).rejects.toThrow('revoked');
  expect(bot.telegram.sendMessage).not.toHaveBeenCalled();
  expect(bot.telegram.sendDocument).not.toHaveBeenCalled();
});
test('uncertain send is surfaced and never automatically resent', async () => {
  const sendMessage = jest.fn<() => Promise<any>>().mockRejectedValue(new Error('connection lost after acceptance'));
  const bot = { telegram: { sendMessage } } as any;
  await expect(deliverNexusFiles('event', '123', bot)).rejects.toThrow('uncertain');
  expect(rows.get(0).state).toBe('uncertain');
  await expect(deliverNexusFiles('event', '123', bot)).rejects.toThrow('uncertain');
  expect(sendMessage).toHaveBeenCalledTimes(1);
});
test('known rejected send retries, successful prior text is skipped before artifact retry', async () => {
  const sendMessage = jest
    .fn<() => Promise<any>>()
    .mockRejectedValueOnce({ response: { error_code: 429 } })
    .mockResolvedValue({ message_id: 10 });
  const sendDocument = jest.fn<() => Promise<any>>().mockResolvedValue({ message_id: 11 });
  const bot = { telegram: { sendMessage, sendDocument } } as any;
  rows.set(1000, { ordinal: 1000, fileId: 'file', state: 'pending', telegramMessageId: null });
  await expect(deliverNexusFiles('event', '123', bot)).rejects.toThrow('rejected');
  expect(rows.get(0).state).toBe('pending');
  await expect(deliverNexusFiles('event', '123', bot)).resolves.toMatchObject({ isSent: true, messageIds: [10, 11] });
  await expect(deliverNexusFiles('event', '123', bot)).resolves.toMatchObject({ isSent: true });
  expect(sendMessage).toHaveBeenCalledTimes(2);
  expect(sendDocument).toHaveBeenCalledTimes(1);
});
