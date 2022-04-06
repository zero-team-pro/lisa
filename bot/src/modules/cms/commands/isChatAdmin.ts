import { Telegraf } from 'telegraf';

import { IJsonRequest, TFunc } from '../../../types';
import { TelegramMessage } from '../../../controllers/telegramMessage';
import { Errors } from '../../../constants';

export const isChatAdmin = async (message: IJsonRequest, bot: Telegraf<TelegramMessage>, t: TFunc) => {
  // TODO: +Url parse
  const { chatId, userId } = message.params;

  let result = { chatId, userId, isAdmin: false };

  try {
    const chat = await bot.telegram.getChat(chatId);
    const chatAdminList = await bot.telegram.getChatAdministrators(chatId);

    if (chat && chatAdminList) {
      chatAdminList?.map((admin) => {
        if (admin?.user?.id === userId) {
          result.isAdmin = true;
        }
      });
    }
  } catch (err) {
    throw Errors.UNKNOWN;
  }

  return result;
};
