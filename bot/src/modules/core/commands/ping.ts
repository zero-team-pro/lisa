import { Message } from 'discord.js';
import { TelegramMessage } from '../../../controllers/telegramMessage';

const methodName = 'ping';

export const exec = async (message: Message | TelegramMessage) => {
  await message.reply('Pong!');
};

export const ping = { methodName, exec };
