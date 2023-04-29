import { TelegramMessage } from '@/controllers/telegramMessage';
import { S3Cloud } from '@/controllers/s3';
import { TelegramUser } from '@/models';
import { getLanguageFromTelegram } from '@/utils';

const DAYS_DIFF_TO_UPDATE = 30;

export const updateTelegramUser = async (message: TelegramMessage) => {
  const id = message?.from?.id;

  if (!id) {
    // TODO: Custom errors
    throw Error;
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

  const [avatarSmallLocalUrl, avatarBigLocalUrl] = await S3Cloud.uploadTelegramAvatar(message.telegram, id);

  const telegramUserUpdate = {
    avatarUrlSmall: avatarSmallLocalUrl,
    avatarUrlBig: avatarBigLocalUrl,
    username: message?.from?.username,
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
    // TODO: Custom errors
    throw Error;
  }

  return telegramUser;
};
