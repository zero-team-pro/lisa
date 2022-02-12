import { NextFunction, Request, Response } from 'express';
import fetch from 'node-fetch';

import { User } from '../models';
import { Errors } from '../constants';
import { ILocals } from '../types';

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

  const users = await User.findAll({ where: { discordId: userId, isAdmin: true }, raw: true });
  const isAdmin = users.length > 0;

  if (!isAdmin) {
    return next(Errors.FORBIDDEN);
  }

  res.locals.users = users;

  next();
};

export default authMiddleware;
