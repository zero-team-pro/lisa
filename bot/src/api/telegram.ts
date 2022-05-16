import express from 'express';

import { catchAsync } from '../utils';
import { Errors } from '../constants';
import { CmsModule } from '../modules';

const router = express.Router();

router.get(
  '/userList',
  catchAsync(async (req, res) => {
    const bridge = req.app.settings?.bridge;
    const adminUser = res.locals.adminUser;

    const userList = await CmsModule.api.userList(bridge, { adminId: adminUser.id });

    res.send(userList?.list);
  }),
);

router.get(
  '/chatList',
  catchAsync(async (req, res) => {
    const bridge = req.app.settings?.bridge;
    const adminUser = res.locals.adminUser;

    const userList = await CmsModule.api.chatList(bridge, { adminId: adminUser.id });

    res.send(userList?.list);
  }),
);

router.post(
  '/isAdmin',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const data = req.body;

    if (!data || !data?.chatId || !data?.userId) {
      return next(Errors.BAD_REQUEST);
    }

    const { chatId, userId } = data;

    const isChatAdmin = await CmsModule.api.isChatAdmin(bridge, { chatId, userId });

    res.send(isChatAdmin);
  }),
);

router.post(
  '/save',
  catchAsync(async (req, res, next) => {
    const data = req.body;

    const preview = ``;

    res.send(preview);
  }),
);

router.post(
  '/preview',
  catchAsync(async (req, res, next) => {
    const preview = ``;

    res.send(preview);
  }),
);

export default router;
