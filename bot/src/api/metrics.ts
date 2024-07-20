import express from 'express';
import got from 'got';

import { Prometheus } from '@/controllers/prometheus';
import { catchAsync } from '@/utils';

const router = express.Router();

enum Host {
  Gateway = 'gateway',
  Telegram = 'telegram',
}

export const fetchMetrics = async (host: Host) => {
  const url = `http://${host}/metrics`;

  return (await got.get(url)).body;
};

router.get(
  '/',
  catchAsync(async (_req, res) => {
    res.type('text/plain');
    res.send(await Prometheus.metrics());
  }),
);

router.get(
  '/gateway',
  catchAsync(async (_req, res) => {
    res.type('text/plain');
    res.send(await fetchMetrics(Host.Gateway));
  }),
);

router.get(
  '/telegram',
  catchAsync(async (_req, res) => {
    res.type('text/plain');
    res.send(await fetchMetrics(Host.Telegram));
  }),
);

export default router;
