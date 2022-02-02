import { NextFunction, Request, Response } from 'express';

import { Locals } from '../types';

export const catchAsync =
  (fn: (req: Request, res: Response<any, Locals>, next: NextFunction) => any) =>
  (req: Request, res: Response<any, Locals>, next: NextFunction) => {
    const routePromise = fn(req, res, next);
    if (routePromise.catch) {
      routePromise.catch((err) => next(err));
    }
  };
