import fetch from 'node-fetch';

import { Errors } from '../constants';
import { RedisClientType } from '../types';

const DISCORD_USER_URL = 'https://discord.com/api/v8/oauth2/@me';

export const getDiscordUser = async (redis: RedisClientType, authorization: string) => {
  let user = JSON.parse(await redis.get(`discordUser:${authorization}`));

  if (!user) {
    const response = await fetch(DISCORD_USER_URL, {
      method: 'GET',
      headers: { authorization },
    });

    if (response.status === 401) {
      throw Errors.UNAUTHORIZED;
    }

    user = await response.json();

    await redis.set(`discordUser:${authorization}`, JSON.stringify(user), { EX: 3600 });
  }

  return user;
};
