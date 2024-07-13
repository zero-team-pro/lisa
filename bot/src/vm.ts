import * as dotenv from 'dotenv';
import 'module-alias/register';
dotenv.config();

import compression from 'compression';
import express from 'express';

import { metrics } from './api';
import { Bridge } from './controllers/bridge';
import { BridgeControllerVM } from '@/controllers/vm/bridgeController';
import { Prometheus, PrometheusService } from './controllers/prometheus';
import { VMConfigUtils } from '@/utils';

const { RABBITMQ_URI } = process.env;

const config = VMConfigUtils.checkOrCreate();

console.log('Config:', config);

if (!config?.id) {
  throw new Error('Config does not have an ID');
}

Prometheus.setService(PrometheusService.VM, config.id);

const bridge = new Bridge(`vm-${config.id}`, {
  url: RABBITMQ_URI,
});
const bridgeController = new BridgeControllerVM(bridge, config);

const app = express();

app.use(compression());

app.use('/metrics', metrics);

app.use((err, _req, res, _next) => {
  // TODO: Logger
  console.log(err);

  if (typeof err?.code === 'number' && err?.code >= 100 && err?.code < 600) {
    res.status(err.code).send({
      status: 'ERROR',
      code: err.code,
      message: err.message,
    });
  } else {
    res.status(500).send({
      status: 'ERROR',
      code: 500,
      message: err.message,
    });
  }
});

app.listen(80, () => {
  console.info('Running API on port 80');
});

bridge.init().then(() => {
  bridgeController.init();
});
