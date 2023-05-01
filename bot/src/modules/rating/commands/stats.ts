import { TFunc } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';
import { BotError } from '@/controllers/botError';

const methodName = 'stats';

const exec = async (message: BaseMessage, t: TFunc) => {
  throw new BotError('Not yet implemented');
};

export const stats = { methodName, exec };
