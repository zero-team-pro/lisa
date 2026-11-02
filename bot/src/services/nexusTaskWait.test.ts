import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { EventEmitter } from 'node:events';
const connection = Object.assign(new EventEmitter(), {
  connect: jest.fn<() => Promise<void>>(),
  query: jest.fn<(sql: string) => Promise<void>>(),
  end: jest.fn<() => Promise<void>>(),
});
jest.mock('pg', () => ({ Client: jest.fn(() => connection) }));
import { waitForNexusTask } from './nexusTaskWait';
beforeEach(() => {
  connection.removeAllListeners();
  connection.connect.mockResolvedValue(undefined);
  connection.query.mockResolvedValue(undefined);
  connection.end.mockResolvedValue(undefined);
});
describe('bounded long polling', () => {
  test('old claims do not allocate a listener connection', async () => {
    const result = await waitForNexusTask({
      ownerChatId: '1',
      waitSeconds: 0,
      signal: new AbortController().signal,
      claim: async () => 'task',
      hasTask: Boolean,
    });
    expect(result).toBe('task');
    expect(connection.connect).not.toHaveBeenCalled();
  });
  test('notification racing an empty query is not lost', async () => {
    let calls = 0;
    const result = await waitForNexusTask({
      ownerChatId: '1',
      waitSeconds: 25,
      signal: new AbortController().signal,
      hasTask: Boolean,
      claim: async () => {
        if (++calls === 1) {
          connection.emit('notification', { channel: 'nexus_task_ready', payload: '1' });
          return null;
        }
        return 'task';
      },
    });
    expect(result).toBe('task');
    expect(calls).toBe(2);
    expect(connection.query).toHaveBeenCalledWith('LISTEN nexus_task_ready');
    expect(connection.end).toHaveBeenCalledTimes(1);
  });
  test('timeout returns empty and closes listener', async () => {
    const result = await waitForNexusTask({
      ownerChatId: '1',
      waitSeconds: 0.01,
      signal: new AbortController().signal,
      claim: async () => null,
      hasTask: Boolean,
    });
    expect(result).toBeNull();
    expect(connection.end).toHaveBeenCalledTimes(1);
  });
  test('disconnect wakes waiter and releases connection', async () => {
    const controller = new AbortController();
    const result = await waitForNexusTask({
      ownerChatId: '1',
      waitSeconds: 25,
      signal: controller.signal,
      hasTask: Boolean,
      claim: async () => {
        setImmediate(() => controller.abort());
        return null;
      },
    });
    expect(result).toBeNull();
    expect(connection.end).toHaveBeenCalledTimes(1);
  });
  test('authorization errors close the listener', async () => {
    await expect(
      waitForNexusTask({
        ownerChatId: '1',
        waitSeconds: 25,
        signal: new AbortController().signal,
        hasTask: Boolean,
        claim: async () => {
          throw Error('forbidden');
        },
      }),
    ).rejects.toThrow('forbidden');
    expect(connection.end).toHaveBeenCalledTimes(1);
  });
});
