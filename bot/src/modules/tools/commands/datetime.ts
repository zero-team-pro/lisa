import { BaseMessage } from '@/controllers/baseMessage';
import { AIOwner } from '@/models';
import { JSONSchema } from 'openai/lib/jsonschema';

const methodName = 'datetime';

const exec = async (_message: BaseMessage) => {};

interface Params {}

const tool = async (_aiOwner: AIOwner, {}: Params): Promise<string> => {
  return new Date().toISOString();
};

const parameters: JSONSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
};

const parametersOld: JSONSchema = {
  type: 'object',
  properties: {
    from: {
      type: 'string',
      description: 'The source currency ISO code',
      minLength: 3,
      maxLength: 3,
      pattern: '^[A-Z]{3}$',
      examples: ['RUB', 'KZT'],
    },
    to: {
      type: 'string',
      description: 'The target currency ISO code',
      minLength: 3,
      maxLength: 3,
      pattern: '^[A-Z]{3}$',
      examples: ['USD', 'EUR'],
    },
    amount: {
      type: 'number',
      description: 'The amount of currency to convert',
      minimum: 0,
    },
    bankFee: {
      type: 'number',
      description: "The bank's conversion fee",
      minimum: 0,
      default: 0,
    },
  },
  required: ['from', 'to'],
  additionalProperties: false,
};

export const datetime = { methodName, exec, tool, parameters };
