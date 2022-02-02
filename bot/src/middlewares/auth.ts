import { NextFunction, Request, Response } from 'express';
import fetch from 'node-fetch';

import { User } from '../models';
import { Errors } from '../constants';
import { Locals } from '../types';

const DISCORD_USER_URL = 'https://discord.com/api/v8/oauth2/@me';

const authMiddleware = async (req: Request, res: Response<any, Locals>, next: NextFunction) => {
  const authorization = req.headers.authorization;

  // TODO: Catch
  const userResponse = await fetch(DISCORD_USER_URL, {
    method: 'GET',
    headers: {
      // Bearer ${token}
      Authorization: authorization,
    },
  });

  if (userResponse.status === 401) {
    return next(Errors.UNAUTHORIZED);
  }

  const userId = await userResponse.json().then((data) => data?.user?.id);
  const users = await User.findAll({ where: { discordId: userId, isAdmin: true }, raw: true });
  const isAdmin = users.length > 0;

  if (!isAdmin) {
    return next(Errors.FORBIDDEN);
  }

  res.locals.users = users;

  next();
};

export default authMiddleware;
