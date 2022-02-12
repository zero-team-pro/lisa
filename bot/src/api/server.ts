import express from 'express';

import { catchAsync, getServerChannels } from '../utils';
import { Channel, Server } from '../models';
import { Errors } from '../constants';
import { ChannelType } from '../types';

const router = express.Router();

router.get(
  '/',
  catchAsync(async (req, res) => {
    const bridge = req.app.settings?.bridge;

    const serverDbList = await Server.findAll({ raw: true });
    const serverIdList = serverDbList.map((server) => server.id);

    const discordGuildListParts = await bridge.requestGlobal({ method: 'guildList', params: serverIdList });
    const discordGuildList = discordGuildListParts.reduce((acc, part) => {
      if (Array.isArray(part.result)) {
        acc = acc.concat(part.result);
      }
      return acc;
    }, []);

    const serverList = await Promise.all(
      serverDbList
        .map((server) => {
          const guild = discordGuildList.find((discordGuild) => discordGuild?.id === server.id && discordGuild.name);
          if (!guild) {
            return null;
          }
          return {
            ...server,
            name: guild.name,
          };
        })
        .filter((guild) => guild),
    );

    res.send(serverList);
  }),
);

router.get(
  '/:serverId',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const serverId = req.params.serverId;

    const server = await Server.findByPk(serverId, { raw: true });

    if (!server) {
      return next(Errors.NOT_FOUND);
    }

    const discordGuildParts = await bridge.requestGlobal({ method: 'guild', params: serverId });
    const guild = discordGuildParts.map((serverPart) => serverPart.result).filter((server) => server)[0];

    const result = { ...server, name: guild?.name, iconUrl: guild?.iconURL, memberCount: guild?.memberCount };

    res.send(result);
  }),
);

router.post(
  '/:serverId/scan',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const serverId = req.params.serverId;

    const ALLOWED_CHANNEL_TYPES: ChannelType[] = ['GUILD_TEXT', 'GUILD_VOICE', 'GUILD_CATEGORY'];

    const server = await Server.findByPk(serverId, { raw: true });

    if (!server) {
      return next(Errors.NOT_FOUND);
    }

    const discordChannelListParts = await bridge.requestGlobal({ method: 'guildChannelList', params: serverId });
    const discordChannelList = discordChannelListParts.map((part) => part.result).filter((channel) => channel)[0];
    if (!discordChannelList) {
      return next(Errors.NOT_FOUND);
    }

    const dbChannels = await Channel.findAll({ where: { serverId } });

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
      .map((channelId) => ({ id: channelId, serverId }));

    const removedChannels = dbChannelIds.filter(
      (dbChannelId) =>
        typeof discordChannelIds.find((discordChannelId) => discordChannelId === dbChannelId) === 'undefined',
    );

    const newChannels = await Channel.bulkCreate(newChannelInstances);
    await Channel.destroy({ where: { id: removedChannels } });

    const result = await getServerChannels(serverId, bridge, discordChannelList);

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

export default router;
