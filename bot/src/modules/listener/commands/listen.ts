import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'listen';

const exec = async (message: BaseMessage) => {
  return await message.reply(`Hi! ${message.content}`);
};

export const listen = { methodName, exec };
