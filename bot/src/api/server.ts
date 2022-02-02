import express from 'express';
import { Client } from 'discord.js';

import { catchAsync } from '../utils';
import { Server } from '../models';
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

export default router;
