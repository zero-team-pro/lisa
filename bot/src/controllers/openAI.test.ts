import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('openai', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/models', () => ({ AICall: { create: jest.fn() }, AIOwner: {}, PaymentTransaction: {} }));
jest.mock('@/controllers/logger', () => ({ Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('p-map', () => ({ __esModule: true, default: async (items: any[], fn: any) => Promise.all(items.map(fn)) }));

// SDK is replaced before the controller is imported. This is not a real credential.
process.env.OPENAI_API_KEY = 'offline-test-key';
import SDK from 'openai';
import { OpenAI } from './openAI';
import { AICall } from '@/models';
import { BotError } from './botError';
import { Transport } from '@/types';

const create = jest.fn<(params: any) => Promise<any>>();
const generate = jest.fn<any>();
const spend = jest.fn<any>().mockResolvedValue(undefined);
const reply = jest.fn<any>().mockResolvedValue([{ uniqueId: 'answer', isSent: true }]);
const photo = jest.fn<any>().mockResolvedValue({ uniqueId: 'photo', isSent: true });
const message = { uniqueId: 'incoming', images: [], replyMessage: reply, replyWithImage: photo } as any;
const owner = { owner: '123', ownerType: 'telegram' } as any;
const account = () => ({ model: null, modelTools: null, maxTokens: null, balance: 1, spend }) as any;
const completion = (content: string) => ({
  model: 'provider-snapshot',
  usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
  choices: [{ finish_reason: 'stop', message: { role: 'assistant', content } }],
});

beforeEach(() => {
  create.mockReset();
  generate.mockReset();
  spend.mockClear();
  reply.mockClear();
  photo.mockClear();
  (SDK as unknown as jest.Mock<any>).mockImplementation(() => ({
    chat: { completions: { create } },
    images: { generate },
  }));
  OpenAI.init();
  OpenAI.initTools([]);
});

describe('OpenAI offline integration', () => {
  test('initialization makes no API calls', () => {
    expect(create).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });
  test('missing credentials allow startup and stop before generation', async () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    let instance: typeof OpenAI;
    try {
      jest.isolateModules(() => {
        instance = require('./openAI').OpenAI;
      });
      const constructorsBefore = (SDK as unknown as jest.Mock).mock.calls.length;
      instance.init();
      expect((SDK as unknown as jest.Mock).mock.calls.length).toBe(constructorsBefore);
      await expect(instance.chat('hello', message, account(), owner, false)).rejects.toThrow(
        'API key is not configured',
      );
      expect(create).not.toHaveBeenCalled();
    } finally {
      process.env.OPENAI_API_KEY = saved;
    }
  });
  test('plain chat omits tools, uses current model and charges reported usage', async () => {
    create.mockResolvedValue(completion('answer'));
    await OpenAI.chat('hello', message, account(), owner, false);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-6-sol',
        reasoning_effort: 'none',
        service_tier: 'default',
        tools: undefined,
      }),
    );
    expect(reply).toHaveBeenCalledWith({ format: 'markdown', text: 'answer' });
    expect(spend).toHaveBeenCalledWith(expect.closeTo(0.00052, 8));
  });
  test('saved retired models fall back without sending the retired ID', async () => {
    create.mockResolvedValue(completion('answer'));
    await OpenAI.chat('hello', message, { ...account(), model: 'text-davinci-003' }, owner, false);
    expect(create.mock.calls[0][0].model).toBe('gpt-6-sol');
  });
  test('zero internal balance stops before any provider request', async () => {
    await expect(OpenAI.chat('hello', message, { ...account(), balance: 0 }, owner, true)).rejects.toBe(
      BotError.BALANCE_LOW,
    );
    expect(create).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });
  test('provider rejection does not charge or deliver an answer', async () => {
    create.mockRejectedValue(new Error('insufficient_quota'));
    await expect(OpenAI.chat('hello', message, account(), owner, false)).rejects.toThrow('insufficient_quota');
    expect(spend).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
  });
  test('router, function execution and follow-up retain compatible parameters', async () => {
    const tool = jest.fn<any>().mockResolvedValue('date result');
    OpenAI.initTools([
      {
        title: 'datetime',
        description: 'date',
        transports: [Transport.OpenAI],
        tool,
        parameters: { type: 'object', properties: {} },
      },
    ] as any);
    create
      .mockResolvedValueOnce(completion('{"tools":["datetime"]}'))
      .mockResolvedValueOnce({
        ...completion(''),
        choices: [
          {
            finish_reason: 'tool_calls',
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{ id: 'call1', type: 'function', function: { name: 'datetime', arguments: '{}' } }],
            },
          },
        ],
      })
      .mockResolvedValueOnce(completion('done'));
    await OpenAI.chat('date?', message, account(), owner, true);
    expect(create.mock.calls.map(([p]) => p.model)).toEqual(['gpt-6-luna', 'gpt-6-sol', 'gpt-6-sol']);
    expect(create.mock.calls.every(([p]) => p.reasoning_effort === 'none' && p.temperature === undefined)).toBe(true);
    expect(tool).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[2][0].messages).toContainEqual({
      role: 'tool',
      tool_call_id: 'call1',
      content: 'date result',
    });
    expect(spend).toHaveBeenCalledTimes(3);
  });
  test('image generation sends decoded bytes and bills token usage', async () => {
    generate.mockResolvedValue({
      data: [{ b64_json: Buffer.from('png-bytes').toString('base64') }],
      usage: {
        input_tokens: 10,
        output_tokens: 100,
        total_tokens: 110,
        input_tokens_details: { text_tokens: 10, image_tokens: 0 },
      },
    });
    jest.spyOn(OpenAI, 'getAIOwner').mockResolvedValueOnce([account(), owner]);
    await OpenAI.image('cat', message);
    expect(generate).toHaveBeenCalledWith({
      model: 'gpt-image-2.5-flare',
      quality: 'medium',
      size: '1024x1024',
      output_format: 'png',
      n: 1,
      prompt: 'cat',
    });
    expect(photo).toHaveBeenCalledWith('image.png', Buffer.from('png-bytes'));
    expect(spend).toHaveBeenCalledWith(expect.closeTo(0.003965, 8));
    expect(AICall.create).toHaveBeenCalledWith(
      expect.objectContaining({ promptTokens: 10, completionTokens: 100, totalTokens: 110 }),
    );
  });
  test('missing image usage fails without invented charges', async () => {
    generate.mockResolvedValue({ data: [{ b64_json: 'YWJj' }] });
    jest.spyOn(OpenAI, 'getAIOwner').mockResolvedValueOnce([account(), owner]);
    await expect(OpenAI.image('cat', message)).rejects.toThrow('missing image data or token usage');
    expect(spend).not.toHaveBeenCalled();
    expect(photo).not.toHaveBeenCalled();
  });
});
