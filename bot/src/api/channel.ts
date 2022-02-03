import express from 'express';
import { Client, ThreadChannel } from 'discord.js';

import { catchAsync } from '../utils';
import { Channel } from '../models';
import { Errors } from '../constants';

const router = express.Router();

router.get(
  '/:serverId',
  catchAsync(async (req, res, next) => {
    const discord: Client = req.app.settings?.discord;
    const serverId = req.params.serverId;

    if (!serverId) {
      return next(Errors.BAD_REQUEST);
    }

    const channelDbList = await Channel.findAll({ where: { serverId }, raw: true, order: ['id'] });

    const guild = await discord.guilds.fetch(serverId);
    const channelDiscordList = await guild.channels.fetch();

    const channelList = await Promise.all(
      channelDbList.map(async (channel) => {
        const channelDiscord = channelDiscordList.find((ch) => ch.id === channel.id);
        const permissions = channelDiscord?.permissionsFor(guild.me);

        return {
          ...channel,
          name: channelDiscord?.name,
          type: channelDiscord?.type,
          position: channelDiscord?.rawPosition || null,
          permissionList: permissions?.toArray(),
          discord: channelDiscord,
        };
      }),
    );

    const result = channelList.sort((a, b) => a.position - b.position);

    res.send(result);
  }),
);

router.patch(
  '/:channelId',
  catchAsync(async (req, res, next) => {
    const discord: Client = req.app.settings?.discord;
    const { channelId } = req.params;
    const data = req.body;

    if (!channelId || !data) {
      return next(Errors.BAD_REQUEST);
    }

    const channel = await Channel.findByPk(channelId);
    const channelDiscord = await discord.channels.fetch(channelId);

    if (!channel || !channelDiscord) {
      return next(Errors.NOT_FOUND);
    }
    if (channelDiscord.type === 'DM') {
      return next(Errors.BAD_REQUEST);
    }

    const value = await channel.update(data);
    // TODO: Permissions or client ignore field
    // const permissions = channelDiscord?.permissionsFor(guild.me);
    const result = {
      isOk: true,
      value: {
        ...value.get({ plain: true }),
        name: channelDiscord?.name,
        type: channelDiscord?.type,
        position: channelDiscord instanceof ThreadChannel ? null : channelDiscord?.rawPosition,
        // permissionList: permissions?.toArray(),
        discord: channelDiscord,
      },
    };

    res.send(result);
  }),
);

export default router;
