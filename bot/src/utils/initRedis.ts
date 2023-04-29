import { readFileSync } from 'fs';
import { createClient } from 'redis';

require('dotenv').config();

const { REDIS_HOST, REDIS_PORT, REDIS_USER, REDIS_PASSWORD } = process.env;

let redisCa;
let redisCert;
let redisKey;
try {
  redisCa = readFileSync('/certs/redis/ca.crt', { encoding: 'utf-8' });
  redisCert = readFileSync('/certs/redis/client.crt', { encoding: 'utf-8' });
  redisKey = readFileSync('/certs/redis/client.key', { encoding: 'utf-8' });
} catch (err) {
  console.log('Reading certs error:', err);
}

export const initRedisSync = () => {
  const redis = createClient({
    socket: {
      host: REDIS_HOST,
      port: Number.parseInt(REDIS_PORT, 10),
      tls: true,
      rejectUnauthorized: false,
      ca: redisCa,
      cert: redisCert,
      key: redisKey,
    },
    username: REDIS_USER,
    password: REDIS_PASSWORD,
  });

  return redis;
};

export const initRedis = async () => {
  const redis = initRedisSync();

  await redis.connect();

  return redis;
};
