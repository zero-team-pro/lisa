import express from 'express';
import { Client, ThreadChannel } from 'discord.js';

import { catchAsync } from '../utils';
import { Channel } from '../models';

const router = express.Router();

router.get(
  '/:serverId',
  catchAsync(async (req, res) => {
    const discord: Client = req.app.settings?.discord;
    const serverId = req.params.serverId;

    if (!serverId) {
      return res.status(400).json({ code: 400 });
    }

    const channelDbList = await Channel.findAll({ where: { serverId }, raw: true, order: ['id'] });

    const guild = await discord.guilds.fetch(serverId);
    const channelDiscordList = await guild.channels.fetch();

    const channelList = await Promise.all(
      channelDbList.map(async (channel) => {
        const channelDiscord = channelDiscordList.find((ch) => ch.id === channel.id);
        return {
          ...channel,
          name: channelDiscord.name,
          type: channelDiscord.type,
          position: channelDiscord.rawPosition,
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
  catchAsync(async (req, res) => {
    const discord: Client = req.app.settings?.discord;
    const { channelId } = req.params;
    const data = req.body;

    if (!channelId || !data) {
      return res.status(400).json({ code: 400 });
    }

    const channel = await Channel.findByPk(channelId);
    const channelDiscord = await discord.channels.fetch(channelId);

    if (!channel || !channelDiscord) {
      return res.status(404).json({ code: 404 });
    }
    if (channelDiscord.type === 'DM') {
      return res.status(400).json({ code: 400 });
    }

    const value = await channel.update(data);
    const result = {
      isOk: true,
      value: {
        ...value.get({ plain: true }),
        name: channelDiscord.name,
        type: channelDiscord.type,
        position: channelDiscord instanceof ThreadChannel ? null : channelDiscord.rawPosition,
        discord: channelDiscord,
      },
    };

    res.send(result);
  }),
);

export default router;
