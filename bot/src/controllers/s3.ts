import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fetch from 'node-fetch';
import { Telegram } from 'telegraf';
import mime from 'mime-types';

import { telegramFindAvatar, telegramGetPhotoLinks } from '../utils';

require('dotenv').config();

class S3 {
  private s3: S3Client;
  private readonly BUCKET: string;
  public readonly PUBLIC_URL: string;

  static readonly Dir = {
    TelegramAvatar: 'tg-avatar',
  };

  constructor() {
    const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_PUBLIC } = process.env;

    if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_REGION || !S3_BUCKET || (!S3_ENDPOINT && !S3_PUBLIC)) {
      console.error(`S3 INIT FAILED`);
      return;
    }

    this.BUCKET = S3_BUCKET;
    this.PUBLIC_URL = S3_PUBLIC || `${S3_ENDPOINT}/${S3_BUCKET}`;

    this.s3 = new S3Client({
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      forcePathStyle: true,
      apiVersion: 'latest',
    });

    console.log(`S3 INIT FINISHED`);
  }

  upload = async (file: Buffer, filename: string, type?: string) => {
    const key = `${S3.Dir.TelegramAvatar}/${filename}`;
    console.log(`S3 UPLOADING: ${key}`);

    try {
      const command = new PutObjectCommand({ Bucket: this.BUCKET, Key: key, Body: file, ContentType: type });
      const res = await this.s3.send(command).catch((err) => {
        console.error('S3 PUT command Error: ', err);
        return null;
      });

      return res ? key : null;
    } catch (err) {
      console.error('S3 PUT Error: ', err);
      return null;
    }
  };

  uploadByLink = async (...links: { url: string; name: string; type?: string }[]) => {
    const promises = await Promise.allSettled(
      links.map(async (link) => {
        const file: Buffer | null = await fetch(link.url)
          .then(async (res) => await res.buffer())
          .catch(() => null);

        // TODO: Proceed null
        return this.upload(file, link.name, link.type);
      }),
    );

    return promises.map((prom) => (prom.status === 'fulfilled' ? prom.value || null : null));
  };

  uploadTelegramAvatar = async (telegram: Telegram, userId: number) => {
    const userProfilePhotos = await telegram.getUserProfilePhotos(userId, 0, 1);
    const lastPhotoList = userProfilePhotos?.photos?.[0];

    const [avatarSmall, avatarBig] = telegramFindAvatar(lastPhotoList);
    const [avatarSmallUrl, avatarBigUrl] = await telegramGetPhotoLinks(telegram, avatarSmall, avatarBig);
    const fileExtension = avatarSmallUrl.match(/\w*$/)?.[0];
    const type = mime.lookup(fileExtension) || undefined;

    const [avatarSmallLocalUrl, avatarBigLocalUrl] = await this.uploadByLink(
      { url: avatarSmallUrl, name: `${userId}_small.${fileExtension || 'jpg'}`, type },
      { url: avatarBigUrl, name: `${userId}_big.${fileExtension || 'jpg'}`, type },
    );

    return [avatarSmallLocalUrl, avatarBigLocalUrl];
  };
}

export const S3Cloud = new S3();
