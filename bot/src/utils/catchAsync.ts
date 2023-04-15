import { NextFunction, Response } from 'express';

import { ILocals, IRequest } from '@/types';

export const catchAsync =
  (fn: (req: IRequest, res: Response<any, ILocals>, next: NextFunction) => any) =>
  (req: IRequest, res: Response<any, ILocals>, next: NextFunction) => {
    return fn(req, res, next)?.catch((err) => next(err));
  };
