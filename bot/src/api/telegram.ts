import express from 'express';

import { catchAsync } from '../utils';
import { Errors } from '../constants';
import { CmsModule } from '../modules';
import { Article, TelegramChat } from '../models';
import { ArticleType, Transport } from '../types';

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

router.get(
  '/article/list',
  catchAsync(async (req, res, next) => {
    const admin = res.locals.adminUser;

    const list = await Article.findAll({ where: { adminId: admin.id }, include: [TelegramChat] });

    res.send(list);
  }),
);

router.post(
  '/article/create',
  catchAsync(async (req, res, next) => {
    const admin = res.locals.adminUser;

    const data = req.body;

    const chat = await TelegramChat.findByPk(data.chatId);
    if (!chat || chat.adminId !== admin.id) {
      return next(Errors.BAD_REQUEST);
    }

    const article = await Article.create({
      transport: Transport.Telegram,
      type: ArticleType.Post,
      title: data?.title,
      text: data?.text,
      adminId: admin.id,
      chatId: chat.id,
    });

    const result = {
      isOk: true,
      isPartial: false,
      value: article,
    };

    res.send(result);
  }),
);

router.get(
  '/preview',
  catchAsync(async (req, res, next) => {
    const preview = ``;

    res.send(preview);
  }),
);

router.post(
  '/article/post',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const admin = res.locals.adminUser;

    const data = req.body;

    const article = await Article.findByPk(data?.id);
    if (!article) {
      return next(Errors.BAD_REQUEST);
    }
    if (article.adminId !== admin.id) {
      return next(Errors.FORBIDDEN);
    }

    const message = await CmsModule.api.sendMessage(bridge, { articleId: article.id });

    if (message.messageId) {
      article.messageId = message.messageId;
    }

    await article.save();

    const result = {
      isOk: message.isSent,
      isPartial: false,
      value: message.messageId,
      error: message.error,
    };

    res.send(result);
  }),
);

export default router;
