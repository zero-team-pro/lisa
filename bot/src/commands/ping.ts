import { Message } from 'discord.js';

export const ping = async (command: string, message: Message) => {
  await message.reply('Pong!');
};
