import { TFunc } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'listen';

const exec = async (message: BaseMessage, t: TFunc) => {
  return await message.reply(`Hi! ${message.content}`);
};

export const listen = { methodName, exec };
