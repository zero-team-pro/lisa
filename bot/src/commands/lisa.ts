import { Message } from 'discord.js';

import { TFunc } from '../types';

export const lisa = async (message: Message, t: TFunc) => {
  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    await message.reply(t('lisa.listening'));
    return;
  }
};
