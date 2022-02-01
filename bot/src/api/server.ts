import express from 'express';

import { catchAsync } from '../utils';
import { Server } from '../models';

const router = express.Router();

router.get(
  '/',
  catchAsync(async (req, res) => {
    const serverList = await Server.findAll();

    res.send(serverList);
  }),
);

router.get(
  '/:serverId',
  catchAsync(async (req, res) => {
    const serverId = req.params.serverId;

    const server = await Server.findByPk(serverId);

    if (!server) {
      res.status(404).json({ code: 404 });
    }

    res.send(server);
  }),
);

export default router;
