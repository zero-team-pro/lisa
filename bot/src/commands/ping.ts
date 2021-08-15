import { Message } from 'discord.js';

export const ping = async (message: Message) => {
  await message.reply('Pong!');
};
