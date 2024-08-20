import 'module-alias/register';
import * as dotenv from 'dotenv';
dotenv.config();

import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import url from 'url';
import UrlValueParser from 'url-value-parser';

import { admin, auth, channel, mastercard, metrics, module, outline, server, telegram, vm } from './api';
import { Bridge } from './controllers/bridge';
import { BridgeControllerGateway } from './controllers/gateway/bridgeController';
import { Logger } from './controllers/logger';
import { Prometheus, PrometheusService } from './controllers/prometheus';
import authMiddleware from './middlewares/auth';
import { sequelize } from './models';
import { initRedisSync } from './utils';

const { DB_FORCE, RABBITMQ_URI, SHARD_COUNT } = process.env;

Prometheus.setService(PrometheusService.Gateway);

const redis = initRedisSync();

const bridge = new Bridge('gateway', {
  url: RABBITMQ_URI,
  shardCount: Number.parseInt(SHARD_COUNT),
});
const bridgeController = new BridgeControllerGateway(bridge);

const databasesInit = async () => {
  let isDatabaseOk = true;
  // TODO: Make it scalable, allow some amount of errors per time
  let redisErrorCount = 0;
  const MAX_REDIS_ERROR_COUNT = 100;

  try {
    await sequelize.authenticate();
    Logger.info('PostgreSQL connection has been established successfully.');
    !!DB_FORCE && Logger.info('FORCE recreating database');
    await sequelize.sync({ alter: false, force: !!DB_FORCE });
    Logger.info('PostgreSQL has been updated to current models successfully.');
  } catch (error) {
    isDatabaseOk = false;
    Logger.error('PostgreSQL init error:', error);
  }
  try {
    // @ts-ignore
    redis.on('error', (err) => {
      Logger.error('Redis Client Error:', err);
      redisErrorCount++;
      if (redisErrorCount > MAX_REDIS_ERROR_COUNT) {
        Logger.error('[Redis] Disconnecting. Error count exceeded max');
        redis.disconnect();
      }
    });
    Logger.info('Redis connecting...');
    await redis.connect();
    Logger.info('Redis connection has been established successfully.');
  } catch (error) {
    isDatabaseOk = false;
    Logger.error('Redis init error:', error);
  }
};

const initList = [bridge.init(), databasesInit()];

/* API Express */

Logger.info('API initialisation...');

const app = express();

app.use((req, res, next) => {
  Prometheus.requestsInc();
  let isProceeded = false;
  const stopRequestDurationTimer = Prometheus.startHttpRequestDurationTimer();

  const urlPathname = new URL(req.url, `http://${req.headers.host}`).pathname;

  const { pathname } = url.parse(req.originalUrl);
  const urlParser = new UrlValueParser({ extraMasks: [] });
  const route = urlParser.replacePathValues(pathname, '#val');

  const checkShouldProceed = (event?: string) => {
    if (isProceeded) {
      return false;
    }

    if (pathname.startsWith('/static') || pathname.startsWith('/metrics')) {
      return false;
    }

    event && Logger.info('Express', { event, route, pathname, urlPathname }, 'Express');

    isProceeded = true;
    return true;
  };

  res.on('finish', () => {
    if (checkShouldProceed('finish')) {
      stopRequestDurationTimer({ method: req.method, code: res.statusCode, route });
    }
  });

  res.on('close', () => {
    if (checkShouldProceed('close')) {
      stopRequestDurationTimer({ method: req.method, code: res.statusCode, route });
    }
  });

  res.on('error', () => {
    if (checkShouldProceed('error')) {
      stopRequestDurationTimer({ method: req.method, code: res.statusCode, route });
    }
  });

  next();
});

app.set('bridge', bridge);
app.set('redis', redis);
app.set('trust proxy', true);

app.use(cors());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static
app.use('/static', express.static('public'));
app.use('/metrics', metrics);

// Public Routes
app.use('/auth', auth);
app.use('/vm', vm);

// Auth check
app.use(authMiddleware);

// Private Routes
app.use('/server', server);
app.use('/channel', channel);
app.use('/module', module);
app.use('/admin', admin);
app.use('/telegram', telegram);
app.use('/vpn/outline', outline);
app.use('/mastercard', mastercard);

app.use((err, _req, res, _next) => {
  Logger.error('Error', err, 'Express');

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

Promise.all(initList).then(() => {
  bridgeController.init();

  app.listen(80, () => {
    Logger.info('Running API on port 80');
  });
});
