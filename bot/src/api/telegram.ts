import express from 'express';

import { catchAsync } from '../utils';
import { Errors } from '../constants';
import { CMS } from '../modules';

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

    const isChatAdmin = await CMS.api.isChatAdminApi(bridge, { chatId, userId });

    res.send(isChatAdmin);
  }),
);

export default router;
