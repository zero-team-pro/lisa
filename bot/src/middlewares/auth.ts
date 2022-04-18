import { NextFunction, Request, Response } from 'express';
import fetch from 'node-fetch';

import { AdminUser } from '../models';
import { Errors } from '../constants';
import { ILocals } from '../types';
import { getAdminMe } from '../utils';

const DISCORD_USER_URL = 'https://discord.com/api/v8/oauth2/@me';

const authMiddleware = async (req: Request, res: Response<any, ILocals>, next: NextFunction) => {
  const redis = req.app.settings?.redis;
  const authorization = req.headers.authorization;

  if (!authorization) {
    return next(Errors.UNAUTHORIZED);
  }

  let userId = await redis.get(`discordToken:${authorization}`);

  if (!userId) {
    // TODO: api/auth the same
    // TODO: Catch
    const userResponse = await fetch(DISCORD_USER_URL, {
      method: 'GET',
      headers: { authorization },
    });

    if (userResponse.status === 401) {
      return next(Errors.UNAUTHORIZED);
    }

    userId = await userResponse.json().then((data) => data?.user?.id);

    await redis.set(`discordToken:${authorization}`, `${userId}`, { EX: 3600 });
  }

  if (!userId) {
    return next(Errors.UNAUTHORIZED);
  }

  const adminMe = await getAdminMe(redis, authorization);
  const adminUser = await AdminUser.findOne({ where: { discordId: userId } });
  // TODO: Вынести
  const allowedRoles = ['globalAdmin', 'admin', 'user'];
  const isAdmin = allowedRoles.includes(adminUser.role);

  if (!isAdmin || !adminMe) {
    return next(Errors.FORBIDDEN);
  }

  res.locals.adminUser = adminUser;
  res.locals.userDiscordId = adminMe?.discordUser?.id;

  next();
};

export default authMiddleware;
