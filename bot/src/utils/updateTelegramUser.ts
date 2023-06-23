import { TelegramMessage } from '@/controllers/telegram/telegramMessage';
import { S3Cloud } from '@/controllers/s3';
import { TelegramUser } from '@/models';
import { getLanguageFromTelegram } from '@/utils';
import { BotError } from '@/controllers/botError';

const DAYS_DIFF_TO_UPDATE = 30;

export const updateTelegramUser = async (message: TelegramMessage) => {
  const id = message.raw.from?.id;

  if (!id) {
    throw new BotError('Server error. Bot cannot get infomation about you.');
  }

  const existingUser = await TelegramUser.findByPk(id);

  // Return Telegram user if exist and not very old
  if (existingUser) {
    const date = +new Date();
    const daysDiff = (date - +existingUser.updatedAt) / 1000 / 3600 / 24;

    if (daysDiff < DAYS_DIFF_TO_UPDATE) {
      return existingUser;
    }
  }

  console.log(`Updating Telegram user with id ${id}`);

  const [avatarSmallLocalUrl, avatarBigLocalUrl] = await S3Cloud.uploadTelegramAvatar(message.raw.telegram, id);

  const telegramUserUpdate = {
    avatarUrlSmall: avatarSmallLocalUrl,
    avatarUrlBig: avatarBigLocalUrl,
    username: message.raw.from?.username,
    lang: getLanguageFromTelegram(message),
  };

  const [telegramUser, isCreated] = await TelegramUser.findOrCreate({
    where: { id },
    defaults: {
      id,
      ...telegramUserUpdate,
    },
  });

  if (!isCreated) {
    await telegramUser.update(telegramUserUpdate);
    await telegramUser.save();
  }

  if (!telegramUser) {
    throw new BotError('Server error. Bot cannot get infomation about you.');
  }

  return telegramUser;
};
