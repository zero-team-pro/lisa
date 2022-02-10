import { ShardingManager } from 'discord.js';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

require('dotenv').config();

import { auth, server, channel } from './api';
import authMiddleware from './middlewares/auth';

const app = express();

const { DISCORD_TOKEN, SHARD_ID } = process.env;

const shardingManager = new ShardingManager('./dist/bot.js', {
  token: DISCORD_TOKEN,
  totalShards: 3,
  shardList: [Number.parseInt(SHARD_ID)],
  respawn: false,
});

shardingManager.on('shardCreate', (shard) => {
  console.log(`[SHARD MANAGER] Shard ${shard.id} launched`);
  // shard.manager.shardList
});

shardingManager.spawn({ timeout: 60000, delay: 2500 });

// client.once('ready', async () => {
//   app.set('discord', client);
// });

/* API Express */

if (!!process.env.API_ON) {
  console.log('API initialisation...');

  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.listen(80, () => {
    console.info('Running API on port 80');
  });

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
}
