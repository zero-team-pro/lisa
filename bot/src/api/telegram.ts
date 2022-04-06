import express from 'express';

import { catchAsync } from '../utils';
import { Errors } from '../constants';

const router = express.Router();

router.get(
  '/',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const adminUser = res.locals.adminUser;
    const data = req.body;

    if (!data || !data?.chatId || !data?.userId) {
      return next(Errors.BAD_REQUEST);
    }

    const { chatId, userId } = data;

    let isChatAdmin;
    try {
      const isChatAdminParts = await bridge.requestGlobal(
        {
          method: 'tg-isChatAdmin',
          params: { chatId, userId },
        },
        ['telegram-0'],
      );
      if (isChatAdminParts.length !== 1) {
        return next(Errors.UNKNOWN);
      }

      const reply = isChatAdminParts[0];
      if (reply?.result) {
        isChatAdmin = reply?.result;
      } else {
        return next(reply?.error || Errors.UNKNOWN);
      }
    } catch (err) {
      return next(err?.code ? err : Errors.UNKNOWN);
    }

    const result = isChatAdmin;

    res.send(result);
  }),
);

export default router;
