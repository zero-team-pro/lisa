require('dotenv').config();

import { Bridge } from './controllers/bridge';
import { Bot } from './controllers/bot';

const { DISCORD_TOKEN, SHARD_ID, RABBITMQ_URI, SHARD_COUNT } = process.env;

const shardId = Number.parseInt(SHARD_ID);
const shardCount = Number.parseInt(SHARD_COUNT);

const bridge = new Bridge({
  url: RABBITMQ_URI,
  shardCount,
  discordToken: DISCORD_TOKEN,
});

bridge.init();

const discordBot = new Bot(bridge, shardId, shardCount);

discordBot.login(DISCORD_TOKEN);
