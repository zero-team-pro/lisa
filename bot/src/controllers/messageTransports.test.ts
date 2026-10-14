import { describe, expect, jest, test } from '@jest/globals';

jest.mock('@/models', () => ({}));
jest.mock('@/modules', () => ({ ModuleList: [] }));
jest.mock('@/translation', () => ({ Translation: () => (key: string) => key }));
jest.mock('@/controllers/prometheus', () => ({ Prometheus: { messagesSentInc: jest.fn() } }));
jest.mock('p-map', () => ({
  __esModule: true,
  default: async (items: any[], mapper: any) => Promise.all(items.map(mapper)),
}));

import { TelegramMessage } from './telegram/telegramMessage';
import { DiscordMessage } from './discord/discordMessage';
import { documentMessage, mdastMessage, textMessage } from '@/messages/document';

const root = {
  type: 'root',
  children: [{ type: 'paragraph', children: [{ type: 'strong', children: [{ type: 'text', value: '*literal*' }] }] }],
} as const;
const telegram = (message: any = { text: 'incoming', from: { id: 123 } }) => {
  const ctx = {
    message,
    chat: { id: 123, type: 'private' },
    botInfo: { id: 9 },
    reply: jest
      .fn<(text: string, extra?: any) => Promise<any>>()
      .mockResolvedValue({ message_id: 42, chat: { id: 123 } }),
  };
  return { ctx, adapter: new TelegramMessage(ctx as any, {} as any, {} as any) };
};

describe('message transport dispatch', () => {
  test('Telegram sends a structured builder result with entities and no parse mode', async () => {
    const { ctx, adapter } = telegram();
    const replies = await adapter.replyMessage(mdastMessage(root as any));
    expect(ctx.reply).toHaveBeenCalledWith('*literal*', {
      parse_mode: undefined,
      entities: [{ type: 'bold', offset: 0, length: 9 }],
    });
    expect(replies).toEqual([{ isSent: true, uniqueId: 'telegram-123-42' }]);
  });

  test('plain reply preserves literal formatting syntax, splits and returns first message identity', async () => {
    const { ctx, adapter } = telegram();
    const text = '*literal* ' + '😀 aaa bbb ccc '.repeat(500);
    const reply = await adapter.reply(text);
    expect(ctx.reply.mock.calls.map(([part]) => part).join('')).toBe(text);
    expect(ctx.reply.mock.calls.every(([, extra]) => extra.entities.length === 0)).toBe(true);
    expect(reply.uniqueId).toBe('telegram-123-42');
  });

  test('Telegram reply history and caption preserve hidden links and code for AI', () => {
    const { adapter } = telegram({
      caption: '/nexus code link',
      caption_entities: [
        { type: 'code', offset: 7, length: 4 },
        { type: 'text_link', offset: 12, length: 4, url: 'https://example.com' },
      ],
      from: { id: 123 },
      reply_to_message: {
        text: 'link',
        entities: [{ type: 'text_link', offset: 0, length: 4, url: 'https://example.org' }],
        from: { id: 9 },
        message_id: 1,
        chat: { id: 123 },
      },
    });
    expect(adapter.content).toBe('/nexus code link');
    expect(adapter.getAIContent(7)).toBe('`code` [link](https://example.com/)');
    expect(adapter.parent.content).toBe('[link](https://example.org/)');
  });

  test('Discord uses its own renderer, limits and disables generated mentions', async () => {
    const raw = {
      content: 'incoming',
      reply: jest.fn<(payload: any) => Promise<any>>().mockResolvedValue({ id: '42', channelId: '123' }),
    };
    const adapter = new DiscordMessage(raw as any, {} as any, {} as any);
    await adapter.replyMessage(mdastMessage(root as any));
    expect(raw.reply).toHaveBeenCalledWith({
      content: '**\\*literal\\***',
      allowedMentions: { parse: [], repliedUser: false },
    });
    raw.reply.mockClear();
    const result = await adapter.replyMessage(
      documentMessage({ runs: [{ text: 'x'.repeat(5000), marks: { bold: true } }] }),
    );
    expect(result).toHaveLength(3);
    expect(raw.reply.mock.calls.every(([payload]) => payload.content.length <= 2000)).toBe(true);
  });
});
