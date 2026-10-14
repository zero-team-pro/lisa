import { JSONSchema } from 'openai/lib/jsonschema';

import { BaseMessage } from '@/controllers/baseMessage';
import { Logger } from '@/controllers/logger';
import { AIOwner } from '@/models';
import { CHAT_MODELS } from '@/services/openaiModels';
import { BotError } from '@/controllers/botError';

const methodName = 'setAIModel';

const exec = async (_message: BaseMessage) => {};

interface Params {
  modelName: string | null;
  modelToolsName: string | null;
  isToolsEnabled: boolean | null;
  maxTokens: number | 'default' | null;
}

const tool = async (
  aiOwner: AIOwner,
  { modelName, modelToolsName, isToolsEnabled, maxTokens }: Params,
): Promise<string> => {
  Logger.info(
    'setAIModel call',
    { params: { modelName, modelToolsName, isToolsEnabled, maxTokens }, aiOwner },
    'Tools',
  );

  const modelSet = new Set<string>(Object.values(CHAT_MODELS));
  const resolveModel = (name: string | null, field: string): string | null | undefined => {
    if (name === null) return undefined;
    if (name === 'default') return null;
    if (modelSet.has(name)) return name;
    throw new BotError(field);
  };

  try {
    // Validate all fields before changing the owner instance.
    const model = resolveModel(modelName, 'modelName');
    const modelTools = resolveModel(modelToolsName, 'modelToolsName');
    if (isToolsEnabled !== null && typeof isToolsEnabled !== 'boolean') throw new BotError('isToolsEnabled');
    if (
      maxTokens !== null &&
      maxTokens !== 'default' &&
      !(Number.isInteger(maxTokens) && maxTokens >= 1000 && maxTokens <= 128_000)
    )
      throw new BotError('maxTokens');
    if (model !== undefined) aiOwner.model = model;
    if (modelTools !== undefined) aiOwner.modelTools = modelTools;
    if (isToolsEnabled !== null) aiOwner.isToolsEnabled = isToolsEnabled;
    if (maxTokens !== null) aiOwner.maxTokens = maxTokens === 'default' ? null : maxTokens;

    await aiOwner.save();

    return 'success';
  } catch (error) {
    Logger.warn('setAIModel error', error, 'Tools');
    return 'error';
  }
};

const parameters: JSONSchema = {
  type: 'object',
  properties: {
    modelName: {
      type: ['string', 'null'],
      description: 'Chat/completion model to use. "default" resets to default. Null do nothing.',
      enum: ['default', ...Object.values(CHAT_MODELS), null],
      examples: [CHAT_MODELS.sol, null],
    },
    modelToolsName: {
      type: ['string', 'null'],
      description:
        'Model used to select tools before the chat request. If there are no explicit instructions to change the model specifically for tools/functions, pass null (leave unchanged). "default" resets to default.',
      enum: ['default', ...Object.values(CHAT_MODELS), null],
      default: null,
      examples: [null, CHAT_MODELS.luna],
    },
    isToolsEnabled: {
      type: ['boolean', 'null'],
      description: 'Enable or disable tool/function calling. Null do nothing.',
    },
    maxTokens: {
      type: ['string', 'number', 'null'],
      description: 'Maximum tokens for the model\'s output (integer). "default" resets to default. Null do nothing.',
      examples: ['default', 5000, null],
    },
  },
  required: ['modelName', 'modelToolsName', 'isToolsEnabled', 'maxTokens'],
  additionalProperties: false,
};

export const setAIModel = { methodName, exec, tool, parameters };
