import { Message } from 'discord.js';

export const lisa = async (command: string, message: Message) => {
  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    await message.reply('Слушаю');
    return;
  }
  command = messageParts[1].replace(',', '').toLocaleLowerCase();
  const params = messageParts.length > 2 ? messageParts.slice(2) : [];
};
