import { TFunc } from '@/types';
import { TelegramMessage } from '@/controllers/telegramMessage';
import { S3Cloud } from '@/controllers/s3';
import { AdminUser, TelegramUser } from '@/models';
import { getLanguageFromTelegram } from '@/utils';

const methodName = 'linkMe';

const exec = async (message: TelegramMessage, t: TFunc) => {
  const [, adminId] = message.content.split(' ');

  let admin: AdminUser;
  try {
    admin = await AdminUser.findByPk(Number.parseInt(adminId, 10));
  } catch (err) {
    return message.reply(t('adminNotFound'));
  }

  const [avatarSmallLocalUrl, avatarBigLocalUrl] = await S3Cloud.uploadTelegramAvatar(
    message.raw.telegram,
    message.raw.from?.id,
  );

  const telegramUserUpdate = {
    avatarUrlSmall: avatarSmallLocalUrl,
    avatarUrlBig: avatarBigLocalUrl,
    username: message.raw.from?.username,
    adminId: admin.id,
    lang: getLanguageFromTelegram(message),
  };

  const [telegramUser, isCreated] = await TelegramUser.findOrCreate({
    where: { id: message.raw.from?.id },
    defaults: {
      id: message.raw.from?.id,
      ...telegramUserUpdate,
    },
  });

  if (!isCreated) {
    await telegramUser.update(telegramUserUpdate);
    await telegramUser.save();
  }

  await message.reply(`Admin ID: ${telegramUser?.adminId}\nTelegram User: @${telegramUser?.username}`);
};

export const linkMe = { methodName, exec };
