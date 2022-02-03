import { NextFunction, Response } from 'express';

import { ILocals, IRequest } from '../types';

export const catchAsync =
  (fn: (req: IRequest, res: Response<any, ILocals>, next: NextFunction) => any) =>
  (req: IRequest, res: Response<any, ILocals>, next: NextFunction) => {
    const routePromise = fn(req, res, next);
    if (routePromise.catch) {
      routePromise.catch((err) => next(err));
    }
  };
