import { beforeEach, expect, jest, test } from '@jest/globals';
jest.mock('@/controllers/baseMessage', () => ({}));
jest.mock('@/services/nexusChat', () => ({ requireNexusTelegram: jest.fn() }));
import { requireNexusTelegram } from '@/services/nexusChat';
import { Transport } from '@/types';
import { mode } from './mode';
beforeEach(() => jest.resetAllMocks());
test('Nexus mode can only be saved after private-chat authorization succeeds', async () => {
  const message = {
    content: '/mode nexus',
    transport: Transport.Telegram,
    setMode: jest.fn<(mode: string | null) => Promise<boolean>>().mockResolvedValue(true),
    reply: jest.fn(),
  };
  jest.mocked(requireNexusTelegram).mockRejectedValueOnce(new Error('Forbidden'));
  await mode.exec(message as never);
  expect(message.setMode).not.toHaveBeenCalled();
  await mode.exec(message as never);
  expect(message.setMode).toHaveBeenCalledWith('nexus');
});
test('Discord cannot enter Nexus mode', async () => {
  const message = { content: '/mode nexus', transport: Transport.Discord, setMode: jest.fn(), reply: jest.fn() };
  await mode.exec(message as never);
  expect(message.setMode).not.toHaveBeenCalled();
});
