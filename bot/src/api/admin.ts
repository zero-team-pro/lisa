import express from 'express';

import { catchAsync } from '../utils';
import { AdminUser, AdminUserServer, Server } from '../models';
import { Errors } from '../constants';
import { fetchGuildAdminList } from './utils';

const router = express.Router();

router.post(
  '/:guildId/add-admin',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const userDiscordId = res.locals.userDiscordId;
    const { guildId } = req.params;
    const data = req.body;

    if (!guildId || !data || !data?.id) {
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

    const adminUserList = await fetchGuildAdminList(bridge, guildId);

    const result = {
      isOk: true,
      isPartial: true,
      value: {
        adminUserList,
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

    if (!guildId || !data || !data?.id) {
      return next(Errors.BAD_REQUEST);
    }

    const guild = await Server.findByPk(guildId);
    const oldAdmin = await AdminUser.findByPk(data.id);

    if (!guild || !oldAdmin) {
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

    await AdminUserServer.destroy({
      where: { serverId: guild.id, adminUserId: oldAdmin.id },
    });

    const adminUserList = await fetchGuildAdminList(bridge, guildId);

    const result = {
      isOk: true,
      isPartial: true,
      value: {
        adminUserList,
      },
    };

    res.send(result);
  }),
);

router.post(
  '/:guildId/check',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const userDiscordId = res.locals.userDiscordId;
    const { guildId } = req.params;

    if (!guildId) {
      return next(Errors.BAD_REQUEST);
    }

    const guild = await Server.findByPk(guildId);
    const adminUser = await AdminUser.findOne({
      where: { discordId: userDiscordId },
    });

    if (!guild || !adminUser) {
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
      where: { serverId: guild.id, adminUserId: adminUser.id },
    });

    const adminUserList = await fetchGuildAdminList(bridge, guildId);

    const result = {
      isOk: true,
      isPartial: true,
      value: {
        adminUserList,
      },
    };

    res.send(result);
  }),
);

export default router;
