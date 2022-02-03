import express from 'express';
import { ThreadChannel } from 'discord.js';

import { catchAsync, getServerChannels } from '../utils';
import { Channel } from '../models';
import { Errors } from '../constants';

const router = express.Router();

router.get(
  '/:serverId',
  catchAsync(async (req, res, next) => {
    const discord = req.app.settings?.discord;
    const serverId = req.params.serverId;

    if (!serverId) {
      return next(Errors.BAD_REQUEST);
    }

    const result = await getServerChannels(serverId, discord);

    res.send(result);
  }),
);

router.patch(
  '/:channelId',
  catchAsync(async (req, res, next) => {
    const discord = req.app.settings?.discord;
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
    const guild = await discord.guilds.fetch(channelDiscord.guild.id);
    const permissions = channelDiscord?.permissionsFor(guild.me);
    const result = {
      isOk: true,
      value: {
        ...value.get({ plain: true }),
        name: channelDiscord?.name,
        type: channelDiscord?.type,
        position: channelDiscord instanceof ThreadChannel ? null : channelDiscord?.rawPosition,
        permissionList: permissions?.toArray(),
        discord: channelDiscord,
      },
    };

    res.send(result);
  }),
);

export default router;
