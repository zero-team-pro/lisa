import { Message } from 'discord.js';
import { TelegramMessage } from '../../../controllers/telegramMessage';

export const ping = async (message: Message | TelegramMessage) => {
  await message.reply('Pong!');
};
