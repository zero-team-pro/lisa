import express from 'express';

import { catchAsync } from '@/utils';
import { VMModule } from '@/modules';

const router = express.Router();

router.get(
  '/ping/:vmId',
  catchAsync(async (req, res) => {
    const bridge = req.app.settings?.bridge;
    const vmId = req.params.vmId;

    const result = await VMModule.api.ping(bridge, { vmId });

    res.send(result.reply);
  }),
);

export default router;
