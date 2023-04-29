import express from 'express';

import { catchAsync, fetchConversionRate } from '@/utils';
import { Errors } from '@/constants';

const router = express.Router();

router.post(
  '/conversion-rate',
  catchAsync(async (req, res, next) => {
    const data = req.body;

    if (typeof data?.amount !== 'number') {
      return next(Errors.BAD_REQUEST);
    }

    const rate = await fetchConversionRate(data);

    const result = {
      isOk: true,
      isPartial: false,
      value: rate,
    };

    res.send(result);
  }),
);

export default router;
