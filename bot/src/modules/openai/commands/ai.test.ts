import { describe, expect, jest, test } from '@jest/globals';
jest.mock('got', () => ({ got: { get: jest.fn() } }));
jest.mock('@/controllers/openAI', () => ({ OpenAI: { getAIOwner: jest.fn(), chat: jest.fn() } }));
import { ai } from './ai';
import { reply } from './reply';
import { OpenAI } from '@/controllers/openAI';
jest.mock('@/models', () => ({ AICall: { findOne: jest.fn() } }));
import { AICall } from '@/models';

describe('AI command dispatch', () => {
  test('/ai without a document works and respects disabled tools', async () => {
    const account = { isToolsEnabled: false };
    (OpenAI.getAIOwner as jest.Mock<any>).mockResolvedValue([account, {}]);
    const message = {
      content: '/ai hello',
      documents: new Map(),
      mode: null,
      getAIContent: jest.fn<any>().mockReturnValue('hello'),
      startTyping: jest.fn(),
      markProcessed: jest.fn(),
    };
    await ai.exec(message as any);
    expect(OpenAI.chat as jest.Mock<any>).toHaveBeenLastCalledWith('hello', message, account, {}, false, false);
  });
  test('reply continuation respects disabled tools', async () => {
    const account = { isToolsEnabled: false };
    (OpenAI.getAIOwner as jest.Mock<any>).mockResolvedValue([account, {}]);
    (AICall.findOne as jest.Mock<any>).mockResolvedValue({});
    const message = {
      parent: { uniqueId: 'previous', isSelf: true, content: 'previous answer' },
      getAIContent: () => 'follow-up',
      startTyping: jest.fn(),
      markProcessed: jest.fn(),
    };
    await reply.exec(message as any);
    expect(OpenAI.chat as jest.Mock<any>).toHaveBeenLastCalledWith('follow-up', message, account, {}, false, false, [
      { role: 'assistant', content: 'previous answer' },
    ]);
  });
});
