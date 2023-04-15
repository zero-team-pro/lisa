import express from 'express';
import got from 'got';

import { catchAsync } from '@/utils';
import { Errors } from '@/constants';
import { ApiOutlineAccessKeys, ApiOutlineServer, ApiOutlineTransfer } from '@/types';
import { AdminUserOutlineServer, OutlineServer } from '@/models';

const router = express.Router();

router.post(
  '/server',
  catchAsync(async (req, res, next) => {
    const { adminUser } = res.locals;
    const data = req.body;

    if (typeof data?.accessUrl !== 'string') {
      return next(Errors.BAD_REQUEST);
    }

    const server = await got.get(`${data.accessUrl}/server`, { rejectUnauthorized: false }).json<ApiOutlineServer>();

    if (!server?.serverId) {
      return next(Errors.FORBIDDEN);
    }

    const [outlineServer] = await OutlineServer.findOrCreate({
      where: {
        externalId: server.serverId,
        accessUrl: data.accessUrl,
      },
      defaults: {
        name: server.name,
      },
    });

    await AdminUserOutlineServer.findOrCreate({
      where: { adminUserId: adminUser.id, outlineServerId: outlineServer.id },
    });

    const result = {
      isOk: true,
      isPartial: false,
      value: outlineServer,
    };

    res.send(result);
  }),
);

router.get(
  '/server/:id/info',
  catchAsync(async (req, res, next) => {
    const { adminUser } = res.locals;
    const { id } = req.params;

    if (!id) {
      return next(Errors.BAD_REQUEST);
    }

    const adminToOutline = await AdminUserOutlineServer.findOne({
      where: { adminUserId: adminUser.id, outlineServerId: id },
    });

    if (!adminToOutline) {
      return next(Errors.NOT_FOUND);
    }

    const outlineServer = await OutlineServer.findOne({ where: { id: adminToOutline.outlineServerId } });

    if (!outlineServer) {
      return next(Errors.NOT_FOUND);
    }

    const server = await got
      .get(`${outlineServer.accessUrl}/server`, { rejectUnauthorized: false })
      .json<ApiOutlineServer>();

    if (!server?.serverId) {
      return next(Errors.FORBIDDEN);
    }

    res.send(server);
  }),
);

router.get(
  '/server/:id/client-list',
  catchAsync(async (req, res, next) => {
    const { adminUser } = res.locals;
    const { id } = req.params;

    if (!id) {
      return next(Errors.BAD_REQUEST);
    }

    const adminToOutline = await AdminUserOutlineServer.findOne({
      where: { adminUserId: adminUser.id, outlineServerId: id },
    });

    if (!adminToOutline) {
      return next(Errors.NOT_FOUND);
    }

    const outlineServer = await OutlineServer.findOne({ where: { id: adminToOutline.outlineServerId } });

    if (!outlineServer) {
      return next(Errors.NOT_FOUND);
    }

    const accessKeys = await got
      .get(`${outlineServer.accessUrl}/access-keys`, { rejectUnauthorized: false })
      .json<ApiOutlineAccessKeys>();

    const metrics = await got
      .get(`${outlineServer.accessUrl}/metrics/transfer`, { rejectUnauthorized: false })
      .json<ApiOutlineTransfer>();

    if (!Array.isArray(accessKeys?.accessKeys) || !metrics?.bytesTransferredByUserId) {
      return next(Errors.UNKNOWN);
    }

    const clientList = accessKeys.accessKeys;
    const transferList = metrics.bytesTransferredByUserId;

    const list = clientList.map((client) => {
      const transferred = transferList[client.id] || 0;

      return { ...client, transfer: transferred };
    });

    res.send(list);
  }),
);

export default router;
