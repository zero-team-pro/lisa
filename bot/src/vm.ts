import * as dotenv from 'dotenv';
import 'module-alias/register';
dotenv.config();

import compression from 'compression';
import express from 'express';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';

import { VMConfig } from '@/types';
import { metrics } from './api';
import { Bridge } from './controllers/bridge';
import { BridgeControllerVM } from '@/controllers/vm/bridgeController';
import { Prometheus, PrometheusService } from './controllers/prometheus';

const { RABBITMQ_URI } = process.env;

const configFilePath = '/data/config.json';

const createNewVMConfigFile = (): VMConfig => {
  const config: VMConfig = {
    id: uuid().split('-').pop(),
  };

  fs.writeFileSync(configFilePath, JSON.stringify(config), 'utf-8');
  console.log('Created new configuration file:', configFilePath);

  return config;
};

const checkAndCreateVMConfigFile = (): VMConfig => {
  if (!fs.existsSync(configFilePath)) {
    console.log('Config file does not exists. Creating new configuration file...');
    return createNewVMConfigFile();
  } else {
    console.log('Config file exists:', configFilePath);
    const configFile = fs.readFileSync(configFilePath);
    const config = JSON.parse(configFile.toString());
    return config as VMConfig;
  }
};

const config = checkAndCreateVMConfigFile();

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
