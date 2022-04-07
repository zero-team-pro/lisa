import { TFunc } from '../../../types';
import { TelegramMessage } from '../../../controllers/telegramMessage';
import { AdminUser, TelegramUser } from '../../../models';
import { getLanguageFromTelegram } from '../../../utils';

const methodName = 'linkMe';

const exec = async (message: TelegramMessage, t: TFunc) => {
  const [, adminId] = message.content.split(' ');

  let admin: AdminUser;
  try {
    admin = await AdminUser.findByPk(Number.parseInt(adminId, 10));
  } catch (err) {
    return message.reply(t('adminNotFound'));
  }

  const [telegramUser] = await TelegramUser.findOrCreate({
    where: { id: message?.from?.id },
    defaults: {
      id: message?.from?.id,
      username: message?.from?.username,
      adminId: admin.id,
      lang: getLanguageFromTelegram(message),
    },
  });

  await message.reply(`Admin ID: ${adminId}\nTelegram User: @${telegramUser?.username}`);
};

export const linkMe = { methodName, exec };
