import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import compression from 'compression';

import { Bridge } from './controllers/bridge';
import { admin, auth, channel, module, server, telegram } from './api';
import authMiddleware from './middlewares/auth';
import { sequelize } from './models';
import { initRedisSync } from './utils';

require('dotenv').config();

const { DB_FORCE, RABBITMQ_URI, SHARD_COUNT } = process.env;

const redis = initRedisSync();

const bridge = new Bridge('gateway', {
  url: RABBITMQ_URI,
  shardCount: Number.parseInt(SHARD_COUNT),
});

const databasesInit = async () => {
  let isDatabaseOk = true;
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection has been established successfully.');
    !!DB_FORCE && console.log('FORCE recreating database');
    await sequelize.sync({ alter: false, force: !!DB_FORCE });
    console.log('PostgreSQL has been updated to current models successfully.');
  } catch (error) {
    isDatabaseOk = false;
    console.error('PostgreSQL init error:', error);
  }
  try {
    redis.on('error', (err) => {
      console.log('Redis Client Error:', err);
    });
    console.log('Redis connecting...');
    await redis.connect();
    console.log('Redis connection has been established successfully.');
  } catch (error) {
    isDatabaseOk = false;
    console.error('Redis init error:', error);
  }
};

const initList = [bridge.init(), databasesInit()];

/* API Express */

console.log('API initialisation...');

const app = express();

app.set('bridge', bridge);
app.set('redis', redis);

app.use(cors());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static
app.use('/static', express.static('public'));

// Public Routes
app.use('/auth', auth);

// Auth check
app.use(authMiddleware);

// Private Routes
app.use('/server', server);
app.use('/channel', channel);
app.use('/module', module);
app.use('/admin', admin);
app.use('/telegram', telegram);

app.use((err, req, res, next) => {
  // TODO: Logger
  console.log(err);

  if (err.code) {
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
  bridge.receiveMessages();
  app.listen(80, () => {
    console.info('Running API on port 80');
  });
});
