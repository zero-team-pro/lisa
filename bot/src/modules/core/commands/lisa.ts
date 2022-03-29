import { Message } from 'discord.js';

import { TFunc } from '../../../types';
import { TelegramMessage } from '../../../controllers/telegramMessage';

export const lisa = async (message: Message | TelegramMessage, t: TFunc) => {
  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    await message.reply(t('lisa.listening'));
    return;
  }
};
