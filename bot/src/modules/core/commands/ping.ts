import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'ping';

export const exec = async (message: BaseMessage) => {
  await message.reply('Pong!');
};

export const ping = { methodName, exec };
