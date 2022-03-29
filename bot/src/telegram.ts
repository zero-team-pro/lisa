require('dotenv').config();

import { Bridge } from './controllers/bridge';
import { TelegramBot } from './controllers/telegramBot';

const { TELEGRAM_TOKEN, SHARD_ID, RABBITMQ_URI } = process.env;

const shardId = Number.parseInt(SHARD_ID);

const bridge = new Bridge(`telegram-${shardId}`, {
  url: RABBITMQ_URI,
});

bridge.init();

const telegramBot = new TelegramBot(bridge, TELEGRAM_TOKEN);

telegramBot.launch();
