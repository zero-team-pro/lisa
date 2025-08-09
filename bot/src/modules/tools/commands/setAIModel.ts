import { JSONSchema } from 'openai/lib/jsonschema';

import { BaseMessage } from '@/controllers/baseMessage';
import { Logger } from '@/controllers/logger';
import { AIOwner } from '@/models';
import { OpenAI } from '@/controllers/openAI';
import { BotError } from '@/controllers/botError';

const methodName = 'setAIModel';

const exec = async (_message: BaseMessage) => {};

interface Params {
  modelName: string | null;
  modelToolsName: string | null;
  isToolsEnabled: boolean;
  maxTokens: number | null;
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

  const modelSet = new Set(Object.values(OpenAI.Model));

  try {
    if (modelName === null) {
      // Do nothing
    } else if (modelName === 'default') {
      aiOwner.model = null;
    } else if (modelSet.has(modelName as any)) {
      aiOwner.model = modelName;
    } else {
      throw new BotError('modelName');
    }

    // if (modelToolsName === null) {
    //   // Do nothing
    // } else if (modelToolsName === 'default') {
    //   aiOwner.modelTools = null;
    // } else if (modelSet.has(modelToolsName as any)) {
    //   aiOwner.modelTools = modelToolsName;
    // } else {
    //   throw new BotError('modelToolsName');
    // }

    // if (typeof isToolsEnabled === 'boolean') {
    //   aiOwner.isToolsEnabled = isToolsEnabled;
    // }

    if (typeof maxTokens === 'string' && maxTokens === 'default') {
      aiOwner.maxTokens = null;
    } else if (typeof maxTokens === 'number' && maxTokens >= 1000 && maxTokens <= 128_000) {
      aiOwner.maxTokens = maxTokens;
    } else if (maxTokens === null) {
      // Do nothing
    } else {
      throw new BotError('maxTokens');
    }

    aiOwner.save();

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
      enum: ['default', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano'],
      examples: ['gpt-5', null],
    },
    modelToolsName: {
      type: ['string', 'null'],
      description:
        'Model to use for tool/function calling. If there are no explicit instructions to change the model specifically for tools/functions, pass null (leave unchanged). "default" resets to default.',
      enum: ['default', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano', null],
      default: null,
      examples: [null, 'gpt-5-nano'],
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
