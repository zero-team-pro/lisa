import { afterEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/services/nexusTasks', () => ({
  NEXUS_TASK_TEXT_MAX_LENGTH: 10_000,
  createNexusTask: jest.fn(),
}));

jest.mock('@/services/nexusTaskAuthorization', () => ({
  NexusTaskForbiddenError: class NexusTaskForbiddenError extends Error {},
}));

jest.mock('@/services/nexusTaskAudit', () => ({
  beginTaskRequest: jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: 'audit-id' }),
  finishTaskRequest: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));
jest.mock('@/services/nexusChat', () => ({
  isNexusChatConfigured: (id: string) => process.env.NOTIFY_TOKENS?.includes(':' + id),
  nexusChatContext: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  nexusReplyTask: jest.fn<() => Promise<null>>().mockResolvedValue(null),
  rememberNexusChatMessage: jest.fn(),
}));
import { beginTaskRequest, finishTaskRequest } from '@/services/nexusTaskAudit';
import { createNexusTask } from '@/services/nexusTasks';
import { nexus, nexusMode, parseNexusCommandText } from './nexus';

const originalTokens = process.env.NOTIFY_TOKENS;
afterEach(() => {
  if (originalTokens === undefined) delete process.env.NOTIFY_TOKENS;
  else process.env.NOTIFY_TOKENS = originalTokens;
});

describe('/nexus command', () => {
  test('extracts and trims task text', () => {
    expect(parseNexusCommandText('/nexus  inspect the vault  ')).toBe('inspect the vault');
  });

  test('rejects empty text and unrelated messages', () => {
    expect(parseNexusCommandText('/nexus')).toBeNull();
    expect(parseNexusCommandText('/nexus   ')).toBeNull();
    expect(parseNexusCommandText('nexus do work')).toBeNull();
  });

  test('starts typing only after the task is durably created', async () => {
    process.env.NOTIFY_TOKENS = 'test-token:123';
    const events: string[] = [];
    jest.mocked(createNexusTask).mockImplementation(async () => {
      events.push('created');
      return { task: { id: 'task-id' } as never, created: true };
    });
    const message = {
      content: '/nexus do work',
      getAIContent(start: number) {
        return this.content.slice(start);
      },
      message: { message_id: 42 },
      raw: { sendChatAction: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) },
      fromId: '123',
      getAdmin: jest.fn(async () => ({ id: 9, role: 'globalAdmin' })),
      markProcessed: jest.fn(),
      chatId: '123',
      uniqueId: '123:42',
      reply: jest.fn(async () => {
        events.push('replied');
      }),
    } as any;

    await nexus.exec(message);

    expect(events).toEqual(['created']);
    expect(message.raw.sendChatAction).toHaveBeenCalledWith('typing');
    expect(createNexusTask).toHaveBeenCalledWith({
      ownerChatId: '123',
      text: 'do work',
      source: 'telegram',
      clientRequestId: 'telegram:123:42',
      createdBy: { type: 'telegram', telegramUserId: '123', adminUserId: 9 },
      interaction: { sourceMessageId: 42, conversationId: '', parentTaskId: null, context: [] },
    });
    expect(message.reply).not.toHaveBeenCalled();
  });
});

test('recognizes addressed commands and newline-separated text', () => {
  const message = (content: string) => ({ content, raw: { botInfo: { username: 'LisaBot' } } }) as any;
  expect(nexus.test(message('/nexus@LisaBot do work'))).toBe(true);
  expect(nexus.test(message('/nexus@OtherBot do work'))).toBe(false);
  expect(nexus.test(message('/nexus\ndo work'))).toBe(true);
  expect(parseNexusCommandText('/nexus@LisaBot do work')).toBe('do work');
});

test('does not enqueue tasks for a chat with no configured worker access', async () => {
  process.env.NOTIFY_TOKENS = 'test-token:456';
  jest.mocked(createNexusTask).mockClear();
  const message = {
    fromId: '123',
    getAdmin: jest.fn(async () => ({ id: 9, role: 'globalAdmin' })),
    content: '/nexus do work',
    getAIContent(start: number) {
      return this.content.slice(start);
    },
    chatId: '123',
    markProcessed: jest.fn(),
    reply: jest.fn(),
  } as any;
  await nexus.exec(message);
  expect(createNexusTask).not.toHaveBeenCalled();
  expect(message.reply).toHaveBeenCalledWith('Nexus tasks are not enabled for this chat.');
});

test.each([null, { id: 9, role: 'user' }, { id: 9, role: 'admin' }])(
  'denies and audits a sender without globalAdmin: %j',
  async (admin) => {
    jest.clearAllMocks();
    process.env.NOTIFY_TOKENS = 'test-token:123';
    const message = {
      content: '/nexus do work',
      getAIContent(start: number) {
        return this.content.slice(start);
      },
      chatId: '123',
      fromId: '123',
      uniqueId: '123:42',
      markProcessed: jest.fn(),
      getAdmin: jest.fn(async () => admin),
      reply: jest.fn(),
    } as any;
    await nexus.exec(message);
    expect(createNexusTask).not.toHaveBeenCalled();
    expect(message.reply).toHaveBeenCalledWith('Nexus tasks require a globalAdmin in their private chat.');
    expect(beginTaskRequest).toHaveBeenCalledWith(
      'create',
      '123',
      { type: 'telegram', telegramUserId: '123', adminUserId: admin?.id || null },
      { text: '/nexus do work', messageId: '123:42' },
    );
    expect(finishTaskRequest).toHaveBeenCalledWith('audit-id', 403, null);
  },
);

test.each([
  { chatId: '-100123', fromId: '123', isGroup: true },
  { chatId: '123', fromId: '456', isGroup: false },
  { chatId: '123', fromId: null, isGroup: false },
  { chatId: '123', fromId: '123', isGroup: false, raw: { message: { sender_chat: { id: '-100123' } } } },
])('rejects shared/anonymous/impersonated Telegram contexts: %j', async (context) => {
  jest.clearAllMocks();
  process.env.NOTIFY_TOKENS = 'test-token:123,test-group:-100123';
  const message = {
    content: '/nexus work',
    uniqueId: '123:42',
    markProcessed: jest.fn(),
    getAdmin: jest.fn(async () => ({ id: 9, role: 'globalAdmin' })),
    reply: jest.fn(),
    ...context,
  } as any;
  await nexus.exec(message);
  expect(createNexusTask).not.toHaveBeenCalled();
  expect(finishTaskRequest).toHaveBeenCalledWith('audit-id', 403, null);
});

test('Nexus mode routes ordinary text but never swallows slash commands', () => {
  expect(nexusMode.test({ mode: 'nexus', content: 'inspect this' } as any)).toBe(true);
  expect(nexusMode.test({ mode: 'nexus', content: '/mode exit' } as any)).toBe(false);
  expect(nexusMode.test({ mode: 'nexus', content: '/ai hello' } as any)).toBe(false);
  expect(nexusMode.test({ mode: 'lisa', content: 'inspect this' } as any)).toBe(false);
});
test('a stale Nexus mode does not grant a revoked administrator task access', async () => {
  jest.clearAllMocks();
  const message = {
    mode: 'nexus',
    content: 'do work',
    chatId: '123',
    fromId: '123',
    uniqueId: '123:50',
    getAdmin: jest.fn(async () => ({ id: 9, role: 'user' })),
    markProcessed: jest.fn(),
    reply: jest.fn(),
  };
  await nexusMode.exec(message as any);
  expect(createNexusTask).not.toHaveBeenCalled();
  expect(finishTaskRequest).toHaveBeenCalledWith('audit-id', 403, null);
});
