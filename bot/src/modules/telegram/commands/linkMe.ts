import { TelegramMessage } from '@/controllers/telegram/telegramMessage';
import { S3Cloud } from '@/controllers/s3';
import { AdminUser, TelegramUser } from '@/models';
import { getLanguageFromTelegram } from '@/utils';

const methodName = 'linkMe';

const exec = async (message: TelegramMessage) => {
  const [, adminToken] = message.content.split(' ');

  if (!adminToken) {
    return message.reply('Please provide a token.');
  }

  const adminId = await message.redis.get(`linkMe:${adminToken}`);

  if (!adminId) {
    return message.reply('Token is not valid.');
  }

  let admin: AdminUser;
  try {
    admin = await AdminUser.findByPk(Number.parseInt(adminId, 10));
  } catch (err) {
    return message.reply(message.t('adminNotFound'));
  }

  if (!admin) {
    return message.reply('Token is valid, but admin was not found for some reason.');
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

  await message.redis.del(`linkMe:${adminToken}`);

  await message.reply(`Admin ID: ${telegramUser?.adminId}\nTelegram User: @${telegramUser?.username}`);
};

export const linkMe = { methodName, exec };
