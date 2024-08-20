import express from 'express';

import { Errors } from '@/constants';
import { Logger } from '@/controllers/logger';
import { VM } from '@/models';
import { VMModule } from '@/modules';
import { catchAsync } from '@/utils';

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

router.post(
  '/state',
  catchAsync(async (req, res, next) => {
    const data = req.body;

    if (!data) {
      return next(Errors.BAD_REQUEST);
    }

    const { vmId, token } = data;

    const vm = await VM.findOne({ where: { id: vmId, token } });

    if (!vm) {
      return next(Errors.UNAUTHORIZED);
    }

    const externalIp = req.ip || req.socket.remoteAddress;
    Logger.info('State', { id: vmId, ip: externalIp }, 'VM');

    await vm.update({ externalIp });

    res.send({ config: { externalIp } });
  }),
);

export default router;
