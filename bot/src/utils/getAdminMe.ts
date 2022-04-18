import fetch from 'node-fetch';

import { Errors } from '../constants';
import { RedisClientType } from '../types';
import { AdminUser } from '../models';

const DISCORD_USER_URL = 'https://discord.com/api/v8/oauth2/@me';

export const getAdminMe = async (redis: RedisClientType, authorization: string) => {
  let adminMe = JSON.parse(await redis.get(`adminMe:${authorization}`));

  if (!adminMe) {
    const response = await fetch(DISCORD_USER_URL, {
      method: 'GET',
      headers: { authorization },
    });

    if (response.status === 401) {
      throw Errors.UNAUTHORIZED;
    }

    const discordMe = await response.json();

    const adminUserProperties = { discordId: discordMe?.user?.id };
    const [adminUser] = await AdminUser.findOrCreate({ where: adminUserProperties, defaults: adminUserProperties });

    const adminMe = {
      discordUser: discordMe?.user,
      admin: adminUser,
    };

    await redis.set(`adminMe:${authorization}`, JSON.stringify(adminMe), { EX: 3600 });
  }

  return adminMe;
};
