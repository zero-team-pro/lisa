import { Telegram } from 'telegraf';

import { PhotoSize } from '../types';

export const telegramFindAvatar = (photoList: PhotoSize[]) => {
  const PHOTO_MIN_WIDTH = 48;

  let photoMin: PhotoSize;
  let photoMax: PhotoSize;

  photoList?.map((photo) => {
    if (!photoMin || (photo.width < photoMin.width && photo.width >= PHOTO_MIN_WIDTH)) {
      photoMin = photo;
    }
    if (!photoMax || photo.width > photoMax.width) {
      photoMax = photo;
    }
  });

  return [photoMin, photoMax];
};

export const telegramGetPhotoLinks = async (telegram: Telegram, ...photoList: PhotoSize[]) => {
  const promises = await Promise.allSettled(
    photoList.map(async (photo) => {
      const url = await telegram.getFileLink(photo);
      return url?.href ?? null;
    }),
  );

  return promises.map((prom) => (prom.status === 'fulfilled' ? prom.value || null : null));
};
