import { describe, expect, jest, test } from '@jest/globals';
jest.mock('@/models', () => ({}));
jest.mock('@/controllers/logger', () => ({ Logger: { info: jest.fn(), warn: jest.fn() } }));
import { setAIModel } from './setAIModel';

const unchanged = { modelName: null, modelToolsName: null, isToolsEnabled: null, maxTokens: null };
const owner = () => ({
  model: null,
  modelTools: null,
  isToolsEnabled: true,
  maxTokens: null,
  save: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
});

describe('AI settings', () => {
  test('updates supported models, tool flag and token limit', async () => {
    const account = owner();
    expect(
      await setAIModel.tool(account as any, {
        modelName: 'gpt-6-luna',
        modelToolsName: 'gpt-6-sol',
        isToolsEnabled: false,
        maxTokens: 2000,
      }),
    ).toBe('success');
    expect(account).toMatchObject({
      model: 'gpt-6-luna',
      modelTools: 'gpt-6-sol',
      isToolsEnabled: false,
      maxTokens: 2000,
    });
    expect(account.save).toHaveBeenCalledTimes(1);
  });
  test.each(['gpt-3.5-turbo-0613', 'gpt-6.1-sol', 'gpt-6-astra'])(
    'rejects unsupported %s without mutating',
    async (modelName) => {
      const account = owner();
      expect(await setAIModel.tool(account as any, { ...unchanged, modelName })).toBe('error');
      expect(account.model).toBeNull();
      expect(account.save).not.toHaveBeenCalled();
    },
  );
  test('invalid token limit does not partially change model', async () => {
    const account = owner();
    expect(await setAIModel.tool(account as any, { ...unchanged, modelName: 'gpt-6-sol', maxTokens: 2000.5 })).toBe(
      'error',
    );
    expect(account.model).toBeNull();
    expect(account.save).not.toHaveBeenCalled();
  });
  test('null leaves unchanged and default resets', async () => {
    const account = { ...owner(), model: 'gpt-6-sol', modelTools: 'gpt-6-sol', maxTokens: 5000 };
    await setAIModel.tool(account as any, unchanged);
    expect(account).toMatchObject({ model: 'gpt-6-sol', modelTools: 'gpt-6-sol', maxTokens: 5000 });
    await setAIModel.tool(account as any, {
      ...unchanged,
      modelName: 'default',
      modelToolsName: 'default',
      maxTokens: 'default',
    });
    expect(account).toMatchObject({ model: null, modelTools: null, maxTokens: null });
  });
});
