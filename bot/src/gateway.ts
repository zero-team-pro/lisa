import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { readFileSync } from 'fs';
import { createClient } from 'redis';

import { Bridge } from './controllers/bridge';
import { auth, channel, server } from './api';
import authMiddleware from './middlewares/auth';
import { sequelize } from './models';

require('dotenv').config();

const { DISCORD_TOKEN, DB_FORCE, REDIS_HOST, REDIS_PORT, REDIS_USER, REDIS_PASSWORD, RABBITMQ_URI, SHARD_COUNT } =
  process.env;

const gateway = new Bridge('gateway', {
  url: RABBITMQ_URI,
  shardCount: Number.parseInt(SHARD_COUNT),
  discordToken: DISCORD_TOKEN,
});

let redisCa;
let redisCert;
let redisKey;
try {
  redisCert = readFileSync('/certs/client.crt', { encoding: 'utf-8' });
  redisKey = readFileSync('/certs/client.key', { encoding: 'utf-8' });
  redisCa = readFileSync('/certs/ca.crt', { encoding: 'utf-8' });
} catch (err) {
  console.log('Reading certs error:', err);
}

const redis = createClient({
  socket: {
    host: REDIS_HOST,
    port: Number.parseInt(REDIS_PORT, 10),
    tls: true,
    rejectUnauthorized: false,
    cert: redisCert,
    key: redisKey,
    ca: redisCa,
  },
  username: REDIS_USER,
  password: REDIS_PASSWORD,
});

const databasesInit = async () => {
  let isDatabaseOk = true;
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection has been established successfully.');
    !!DB_FORCE && console.log('FORCE recreating database');
    await sequelize.sync({ alter: true, force: !!DB_FORCE });
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

const initList = [gateway.init(), databasesInit()];

/* API Express */

const app = express();

console.log('API initialisation...');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Auth
app.use('/auth', auth);
app.use(authMiddleware);

// Routes
app.use('/server', server);
app.use('/channel', channel);

app.use((err, req, res, next) => {
  // TODO: Logger
  console.log(err);

  if (err.code) {
    res.status(err.code).send({
      status: 'ERROR',
      error: err.message,
    });
  } else {
    res.status(500).send({
      status: 'ERROR',
      error: err.message,
    });
  }
});

Promise.all(initList).then(() => {
  gateway.receiveMessages(() => {}, 'alive');
  app.listen(80, () => {
    console.info('Running API on port 80');
  });
});
