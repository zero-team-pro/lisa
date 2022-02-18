import fetch from 'node-fetch';

import { Errors } from '../constants';
import { RedisClientType } from '../types';
import { AdminUser } from '../models';

const DISCORD_USER_URL = 'https://discord.com/api/v8/oauth2/@me';

export const getDiscordUser = async (redis: RedisClientType, authorization: string) => {
  let discordUser = JSON.parse(await redis.get(`discordUser:${authorization}`));

  if (!discordUser) {
    const response = await fetch(DISCORD_USER_URL, {
      method: 'GET',
      headers: { authorization },
    });

    if (response.status === 401) {
      throw Errors.UNAUTHORIZED;
    }

    discordUser = await response.json();

    const adminUserProperties = { discordId: discordUser?.user?.id };
    await AdminUser.findOrCreate({ where: adminUserProperties, defaults: adminUserProperties });

    await redis.set(`discordUser:${authorization}`, JSON.stringify(discordUser), { EX: 3600 });
  }

  return discordUser;
};
