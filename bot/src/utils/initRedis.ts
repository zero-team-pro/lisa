import { readFileSync } from 'fs';
import { createClient } from 'redis';

require('dotenv').config();

const { REDIS_HOST, REDIS_PORT, REDIS_USER, REDIS_PASSWORD } = process.env;

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

export const initRedis = async () => {
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

  await redis.connect();

  return redis;
};
