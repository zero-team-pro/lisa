import express from 'express';

import { statusService } from '@/services/status';
import { catchAsync } from '@/utils';

const router = express.Router();

router.get(
  '/',
  catchAsync(async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.send(await statusService.getSnapshot());
  }),
);

export default router;
