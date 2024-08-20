import 'module-alias/register';
import * as dotenv from 'dotenv';
dotenv.config();

import compression from 'compression';
import express from 'express';

import { metrics } from './api';
import { Bridge } from './controllers/bridge';
import { Logger } from './controllers/logger';
import { Prometheus, PrometheusService } from './controllers/prometheus';
import { TelegramBot } from './controllers/telegramBot';

const { TELEGRAM_TOKEN, SHARD_ID, RABBITMQ_URI } = process.env;

const shardId = Number.parseInt(SHARD_ID);

Prometheus.setService(PrometheusService.Telegram);

const bridge = new Bridge(`telegram-${shardId}`, {
  url: RABBITMQ_URI,
});

const app = express();

app.use(compression());

app.use('/metrics', metrics);

app.use((err, _req, res, _next) => {
  // TODO: Logger
  Logger.error('Error', err);

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
  Logger.info('Running API on port 80');
});

const telegramBot = new TelegramBot(bridge, TELEGRAM_TOKEN);

telegramBot.launch();
