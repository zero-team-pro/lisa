import express from 'express';

import { catchAsync } from '../utils';
import { ModuleList } from '../modules';
import { STATIC_URL } from '../constants';

const router = express.Router();

router.get(
  '/',
  catchAsync(async (req, res) => {
    const result = ModuleList.map((module) => {
      const { meta } = module;
      return { id: meta.id, title: meta.title, iconUrl: `${STATIC_URL}/module-icons/${meta.id}.png` };
    });

    res.send(result);
  }),
);

export default router;
