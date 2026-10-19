import { afterEach, expect, jest, test } from '@jest/globals';
jest.mock('@/controllers/logger', () => ({ Logger: { info: jest.fn(), warn: jest.fn() } }));
import { Logger } from '@/controllers/logger';
import { Bridge } from './bridge';
afterEach(() => {
  jest.useRealTimers();
});
test('video bridge transports intact payload but redacts video and lease from debug logs', async () => {
  jest.useFakeTimers();
  const bridge = new Bridge('gateway', { url: 'amqp://unused' }) as any;
  bridge.isDebug = true;
  const sendToQueue = jest.fn();
  bridge.sendingChannel = { sendToQueue };
  const params = { leaseToken: 'private-lease', video: 'private-video', taskId: 'task' };
  const response = bridge.requestGlobal({ method: 'tg-nexus-video', params }, ['telegram'], 180_000);
  expect(JSON.parse(sendToQueue.mock.calls[0][1] as string).params).toEqual(params);
  expect(JSON.stringify(jest.mocked(Logger.info).mock.calls)).not.toContain('private-lease');
  expect(JSON.stringify(jest.mocked(Logger.info).mock.calls)).not.toContain('private-video');
  bridge.requestGlobalResolveList[1].telegram({ result: { state: 'sent' } });
  await expect(response).resolves.toEqual([{ result: { state: 'sent' } }]);
  jest.clearAllTimers();
});
