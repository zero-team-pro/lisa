import express from 'express';
import { ThreadChannel } from 'discord.js';

import { catchAsync, getServerChannels } from '../utils';
import { Channel } from '../models';
import { Errors } from '../constants';

const router = express.Router();

router.get(
  '/:serverId',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const serverId = req.params.serverId;

    if (!serverId) {
      return next(Errors.BAD_REQUEST);
    }

    const result = await getServerChannels(serverId, bridge);

    res.send(result);
  }),
);

router.patch(
  '/:channelId',
  catchAsync(async (req, res, next) => {
    const bridge = req.app.settings?.bridge;
    const { channelId } = req.params;
    const data = req.body;

    if (!channelId || !data) {
      return next(Errors.BAD_REQUEST);
    }

    const channel = await Channel.findByPk(channelId);
    const guildId = channel.serverId;
    if (!channel || !guildId) {
      return next(Errors.NOT_FOUND);
    }

    const discordChannelParts = await bridge.requestGlobal({ method: 'guildChannel', params: { guildId, channelId } });
    const channelDiscord = discordChannelParts.map((part) => part.result).filter((channel) => channel)[0];

    if (!channel || !channelDiscord) {
      return next(Errors.NOT_FOUND);
    }
    if (channelDiscord.type === 'DM') {
      return next(Errors.BAD_REQUEST);
    }

    const value = await channel.update(data);

    const result = {
      isOk: true,
      value: {
        ...value.get({ plain: true }),
        name: channelDiscord?.name,
        type: channelDiscord?.type,
        position: channelDiscord instanceof ThreadChannel ? null : channelDiscord?.rawPosition,
        permissionList: channelDiscord?.permissionList,
        discord: channelDiscord,
      },
    };

    res.send(result);
  }),
);

export default router;
