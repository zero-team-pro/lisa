import 'module-alias/register';
import * as dotenv from 'dotenv';
dotenv.config();

import { Bridge } from './controllers/bridge';
import { Discord } from './controllers/discord';

const { DISCORD_TOKEN, SHARD_ID, RABBITMQ_URI, SHARD_COUNT } = process.env;

const shardId = Number.parseInt(SHARD_ID);
const shardCount = Number.parseInt(SHARD_COUNT);

const bridge = new Bridge(`bot-${shardId}`, {
  url: RABBITMQ_URI,
  shardCount,
});

bridge.init();

const discordBot = new Discord(bridge, shardId, shardCount);

discordBot.login(DISCORD_TOKEN);
