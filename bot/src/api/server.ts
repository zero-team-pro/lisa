import express from 'express';

import { catchAsync } from '../utils';
import { Server } from '../models';

const router = express.Router();

router.get(
  '/list',
  catchAsync(async (req, res) => {
    const serverList = await Server.findAll();

    res.send(serverList);
  }),
);

export default router;
