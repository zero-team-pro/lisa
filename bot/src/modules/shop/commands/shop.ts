import { Markup } from 'telegraf';

import { TFunc } from '../../../types';
import { TelegramMessage } from '../../../controllers/telegramMessage';

const methodName = 'shop';

const exec = async (message: TelegramMessage, t: TFunc) => {
  const keyboard = Markup.inlineKeyboard([
    Markup.button.url('List', 'https://telegraf.js.org'),
    Markup.button.callback('Exit', 'exit'),
  ]);

  await message.reply('Some text', keyboard);
};

export const shop = { methodName, exec };