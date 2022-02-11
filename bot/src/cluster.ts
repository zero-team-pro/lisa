require('dotenv').config();

import { Rabbit } from './controllers/rabbit';
import { Bot } from './bot';

const { DISCORD_TOKEN, SHARD_ID, RABBITMQ_URI } = process.env;

const bridge = new Rabbit({
  url: RABBITMQ_URI,
  shardCount: 1,
  discordToken: DISCORD_TOKEN,
});

bridge.init();

const shardId = Number.parseInt(SHARD_ID);

const discordBot = new Bot(bridge, shardId);

discordBot.login(DISCORD_TOKEN);
