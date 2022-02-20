import express from 'express';
import { Sequelize } from 'sequelize';

import { catchAsync, getServerChannels } from '../utils';
import { AdminUser, Channel, Server, User } from '../models';
import { Errors } from '../constants';
import { ChannelType } from '../types';
import { Bridge } from '../controllers/bridge';

const router = express.Router();

router.get(
  '/',
  catchAsync(async (req, res) => {
    const bridge = req.app.settings?.bridge;
    const userDiscordId = res.locals.userDiscordId;

    const serverDbList = await Server.findAll({ order: ['id'], raw: true });
    const serverIdList = serverDbList.map((server) => server.id);

    const discordGuildListParts = await bridge.requestGlobal({
      method: 'guildList',
      params: { reqList: serverIdList, userDiscordId },
    });
    const discordGuildList = discordGuildListParts.reduce((acc, part) => {
      if (Array.isArray(part.result)) {
        acc = acc.concat(part.result);
      }
      return acc;
    }, []);

    const serverList = serverDbList
      .map((server) => {
        const guild = discordGuildList.find((discordGuild) => discordGuild?.id === server.id);
        if (!guild) {
          return null;
        }
        return {
          ...server,
          name: guild.name,
          iconUrl: guild?.iconURL,
          memberCount: guild?.memberCount,
          shardId: guild?.shardId,
        };
      })
      .filter((guild) => guild);

    res.send(serverList);
  }),
);

router.get(
  '/:guildId',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const guildId = req.params.guildId;
    const userDiscordId = res.locals.userDiscordId;
    const adminUser = res.locals.adminUser;

    const server = await Server.findOne({
      where: { id: guildId },
      attributes: {
        include: [[Sequelize.fn('COUNT', Sequelize.col('users.id')), 'localUserCount']],
      },
      include: [{ model: User, attributes: [] }],
      group: ['Server.id'],
      raw: true,
    });
    // const server = await Server.findOne({
    //   where: { id: guildId },
    //   attributes: {
    //     include: [
    //       [
    //         Sequelize.literal('(SELECT COUNT(*) FROM "user" AS "User" WHERE "User"."serverId"="Server"."id")'),
    //         'localUserCount',
    //       ],
    //     ],
    //   },
    //   include: [
    //     { model: AdminUser, as: 'adminUserList', through: { attributes: [] } },
    //   ],
    // });

    if (!server) {
      return next(Errors.NOT_FOUND);
    }

    const [guildResponse, guildAdminListResponse] = await Promise.all([
      await fetchGuild(bridge, guildId, userDiscordId),
      await fetchGuildAdminList(bridge, guildId),
    ]);

    const guild = guildResponse?.guild;
    const guildIsAdmin = guildResponse?.isAdmin || false;

    const guildAdminList = guildAdminListResponse?.adminUserList;

    const result = {
      ...server,
      name: guild?.name,
      iconUrl: guild?.iconURL,
      memberCount: guild?.memberCount,
      shardId: guild?.shardId,
      isAdmin: guildIsAdmin,
      adminUser: adminUser,
      adminUserList: guildAdminList,
    };

    res.send(result);
  }),
);

const fetchGuild = async (bridge: Bridge, guildId: string, userDiscordId: string) => {
  const discordGuildParts = await bridge.requestGlobal({ method: 'guild', params: { guildId, userDiscordId } });
  return discordGuildParts.map((guildPart) => guildPart.result).filter((guild) => guild)[0];
};

const fetchGuildAdminList = async (bridge: Bridge, guildId: string) => {
  const guildAdminListParts = await bridge.requestGlobal({ method: 'guildAdminList', params: { guildId } });
  return guildAdminListParts.map((guildPart) => guildPart.result).filter((guild) => guild)[0];
};

router.post(
  '/:guildId/scan',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const guildId = req.params.guildId;
    const userDiscordId = res.locals.userDiscordId;

    const ALLOWED_CHANNEL_TYPES: ChannelType[] = ['GUILD_TEXT', 'GUILD_VOICE', 'GUILD_CATEGORY'];

    const server = await Server.findByPk(guildId, { raw: true });

    if (!server) {
      return next(Errors.NOT_FOUND);
    }

    const discordChannelListParts = await bridge.requestGlobal({
      method: 'guildChannelList',
      params: { guildId, isAdminCheck: true, userDiscordId },
    });
    const discordChannelListResult = discordChannelListParts.filter((channel) => channel.result)[0];
    const discordChannelList = discordChannelListResult.result;

    if (discordChannelListResult.error) {
      return next(discordChannelListResult.error);
    }
    if (!discordChannelList) {
      return next(Errors.NOT_FOUND);
    }

    const dbChannels = await Channel.findAll({ where: { serverId: guildId } });

    const discordChannelIds = discordChannelList
      .filter((channel) => ALLOWED_CHANNEL_TYPES.includes(channel.type))
      .map((channel) => channel.id);
    const dbChannelIds = dbChannels.map((channel) => channel.id);

    const syncedChannel = await Channel.findAll({
      where: {
        id: discordChannelIds,
      },
    });

    const newChannelInstances = discordChannelIds
      .filter((channelId) => typeof syncedChannel.find((channel) => channel.id === channelId) === 'undefined')
      .map((channelId) => ({ id: channelId, serverId: guildId }));

    const removedChannels = dbChannelIds.filter(
      (dbChannelId) =>
        typeof discordChannelIds.find((discordChannelId) => discordChannelId === dbChannelId) === 'undefined',
    );

    const newChannels = await Channel.bulkCreate(newChannelInstances);
    await Channel.destroy({ where: { id: removedChannels } });

    const result = await getServerChannels(guildId, bridge, discordChannelList);

    const ignored = discordChannelList.filter((channel) => !ALLOWED_CHANNEL_TYPES.includes(channel.type));

    res.send({
      isOk: true,
      new: newChannels.map((ch) => ch.id),
      removed: removedChannels,
      unchanged: syncedChannel.map((ch) => ch.id),
      ignored,
      value: result,
    });
  }),
);

router.post(
  '/:guildId/module',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const userDiscordId = res.locals.userDiscordId;
    const { guildId } = req.params;
    const data = req.body;

    if (!guildId || !data || !data.id || typeof data.isEnabled === 'undefined') {
      return next(Errors.BAD_REQUEST);
    }

    const guild = await Server.findByPk(guildId);

    if (!guild) {
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

    if (data.isEnabled) {
      guild.modules.push(data.id);
    } else {
      guild.modules = guild.modules.filter((moduleId) => moduleId !== data.id);
    }
    guild.changed('modules', true);
    const guildUpdated = await guild.save();

    const result = {
      isOk: true,
      isPartial: true,
      value: {
        modules: guildUpdated.modules,
      },
    };

    res.send(result);
  }),
);

export default router;
