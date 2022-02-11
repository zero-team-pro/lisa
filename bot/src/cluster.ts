require('dotenv').config();

import { Rabbit } from './controllers/rabbit';
import { Bot } from './bot';

const { DISCORD_TOKEN, SHARD_ID, RABBITMQ_URI, SHARD_COUNT } = process.env;

const shardId = Number.parseInt(SHARD_ID);
const shardCount = Number.parseInt(SHARD_COUNT);

const bridge = new Rabbit({
  url: RABBITMQ_URI,
  shardCount,
  discordToken: DISCORD_TOKEN,
});

bridge.init();

const discordBot = new Bot(bridge, shardId, shardCount);

discordBot.login(DISCORD_TOKEN);
