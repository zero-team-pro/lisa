import express from 'express';

import { catchAsync } from '../utils';
import { AdminUser, AdminUserServer, Server } from '../models';
import { Errors } from '../constants';

const router = express.Router();

router.post(
  '/:guildId/add-admin',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const userDiscordId = res.locals.userDiscordId;
    const { guildId } = req.params;
    const data = req.body;

    if (!guildId || !data || !data.id) {
      return next(Errors.BAD_REQUEST);
    }

    const guild = await Server.findByPk(guildId);
    const newAdmin = await AdminUser.findByPk(data.id);

    if (!guild || !newAdmin) {
      return next(Errors.NOT_FOUND);
    }

    const isAdminParts = await bridge.requestGlobal({
      method: 'isAdmin',
      params: { guildId, userDiscordId },
    });
    const isAdminResponse = isAdminParts.filter((channel) => channel.result)[0];
    if (isAdminResponse.error) {
      return next(isAdminResponse.error);
    }

    await AdminUserServer.findOrCreate({
      where: { serverId: guild.id, adminUserId: newAdmin.id },
    });

    const guildUpdated = await Server.findByPk(guildId, {
      include: [{ model: AdminUser, as: 'adminUserList', through: { attributes: [] } }],
    });

    const result = {
      isOk: true,
      isPartial: true,
      value: {
        adminUserList: guildUpdated.adminUserList,
      },
    };

    res.send(result);
  }),
);

router.post(
  '/:guildId/del-admin',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const userDiscordId = res.locals.userDiscordId;
    const { guildId } = req.params;
    const data = req.body;

    if (!guildId || !data || !data.id) {
      return next(Errors.BAD_REQUEST);
    }

    const guild = await Server.findByPk(guildId);
    const oldAdmin = await AdminUser.findByPk(data.id);

    if (!guild || !oldAdmin) {
      return next(Errors.NOT_FOUND);
    }

    // const isAdminParts = await bridge.requestGlobal({
    //   method: 'isAdmin',
    //   params: { guildId, userDiscordId },
    // });
    // const isAdminResponse = isAdminParts.filter((channel) => channel.result)[0];
    // if (isAdminResponse.error) {
    //   return next(isAdminResponse.error);
    // }

    await AdminUserServer.destroy({
      where: { serverId: guild.id, adminUserId: oldAdmin.id },
    });

    const guildUpdated = await Server.findByPk(guildId, {
      include: [{ model: AdminUser, as: 'adminUserList', through: { attributes: [] } }],
    });

    const result = {
      isOk: true,
      isPartial: true,
      value: {
        adminUserList: guildUpdated.adminUserList,
      },
    };

    res.send(result);
  }),
);

export default router;
