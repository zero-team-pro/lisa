import express from 'express';
import { Client } from 'discord.js';

import { catchAsync } from '../utils';
import { Channel, Server } from '../models';
import { Errors } from '../constants';

const router = express.Router();

router.get(
  '/',
  catchAsync(async (req, res) => {
    const discord: Client = req.app.settings?.discord;

    const serverDbList = await Server.findAll({ raw: true });

    const serverList = await Promise.all(
      serverDbList.map(async (server) => {
        const guild = await discord.guilds.fetch(server.id);
        return {
          ...server,
          name: guild.name,
        };
      }),
    );

    res.send(serverList);
  }),
);

router.get(
  '/:serverId',
  catchAsync(async (req, res, next) => {
    const discord: Client = req.app.settings?.discord;
    const serverId = req.params.serverId;

    const server = await Server.findByPk(serverId, { raw: true });

    if (!server) {
      return next(Errors.NOT_FOUND);
    }

    const guild = await discord.guilds.fetch(server.id);

    const result = { ...server, name: guild.name, iconUrl: guild.iconURL(), memberCount: guild.memberCount };

    res.send(result);
  }),
);

router.post(
  '/:serverId/scan',
  catchAsync(async (req, res, next) => {
    const discord: Client = req.app.settings?.discord;
    const serverId = req.params.serverId;

    const server = await Server.findByPk(serverId, { raw: true });

    if (!server) {
      return next(Errors.NOT_FOUND);
    }

    const guild = await discord.guilds.fetch(serverId);
    const discordChannels = await guild.channels.fetch();
    const dbChannels = await Channel.findAll({ where: { serverId } });

    // const channelIds = discordChannels.filter((channel) => channel.type === 'GUILD_TEXT').map((channel) => channel.id);
    const discordChannelIds = discordChannels
      .filter((channel) => channel.type === 'GUILD_TEXT')
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

    // const newChannels = await Channel.bulkCreate(newChannelInstances);

    const result = {
      synced: syncedChannel.map((ch) => ch.id),
      new: newChannelInstances.map((ch) => ch.id),
      deleted: removedChannels,
    };

    res.send({ isOk: true, value: result });
  }),
);

export default router;
