import { Client as DiscordClient, Intents, Message } from 'discord.js';
import { readFileSync } from 'fs';
import { createClient } from 'redis';

require('dotenv').config();

import commands from './commands';
import { Channel, sequelize, Server, User } from './models';
import { CommandMap } from './types';
import Translation from './translation';
import { Rabbit } from './controllers/rabbit';

const { DB_FORCE, REDIS_HOST, REDIS_PORT, REDIS_USER, REDIS_PASSWORD } = process.env;

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

const commandMap: CommandMap[] = [
  {
    test: 'ping',
    exec: commands.ping,
  },
  {
    test: 'rate',
    exec: commands.processRaterCommand,
  },
  {
    test: 'lisa',
    exec: commands.lisa,
  },
  {
    test: 'config',
    exec: commands.config,
  },
  {
    test: 'debug',
    exec: commands.debug,
  },
  {
    test: 'lang',
    exec: commands.lang,
  },
  {
    test: 'preset',
    exec: commands.preset,
  },
  {
    test: 'help',
    exec: commands.help,
  },
  {
    test: 'info',
    exec: commands.info,
  },
  {
    test: 'raterEngine'.toLocaleLowerCase(),
    exec: commands.raterEngine,
  },
];

export class Bot {
  private client: DiscordClient;
  private bridge: Rabbit;
  private shardId: number;

  constructor(bridge: Rabbit, shardId: number) {
    this.bridge = bridge;

    this.shardId = shardId;
    this.client = Bot.createClient(shardId);
    // TODO: async in init
    this.onReady();
    this.onMessageCreate();
  }

  public login(discordToken: string) {
    return this.client.login(discordToken);
  }

  private static createClient(shardId: number) {
    return new DiscordClient({
      intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
      shards: shardId,
      shardCount: 2,
    });
  }

  private onReady() {
    this.client.once('ready', async () => {
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
        // redis.on('error', (err) => {
        //   console.log('Redis Client Error:', err);
        // });
        console.log('Redis connecting...');
        await redis.connect();
        console.log('Redis connection has been established successfully.');
      } catch (error) {
        isDatabaseOk = false;
        console.error('Redis init error:', error);
      }

      console.log('Ready!');

      const welcomeMessage = isDatabaseOk ? 'Лиза проснулась' : 'Лиза проснулась без базы данных';

      this.bridge.sendMessage('hello', `Shard ${this.shardId} is ready`);

      // (channel as any).send(welcomeMessage);
    });
  }

  private getUser = async (message: Message, server: Server) => {
    const [user] = await User.findOrCreate({
      where: { discordId: message.author.id, serverId: message.guild.id },
      defaults: { discordId: message.author.id, serverId: server.id },
    });
    return user;
  };

  private onMessageCreate() {
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) {
        return;
      }

      const [server] = await Server.findOrCreate({
        where: { id: message.guild.id },
        defaults: { id: message.guild.id },
        include: 'channels',
      });

      const messageCache = { author: message.author.username, content: message.content };
      await redis.set('lastMessage', `${messageCache.content} ${new Date()}`, { EX: 3600 });

      const currentChannel = await Channel.findByPk(message.channel.id);
      if (
        message.channel.id !== process.env.MAIN_CHANNEL_ID &&
        server.mainChannelId &&
        message.channel.id !== server.mainChannelId &&
        (!currentChannel || !currentChannel.isEnabled) &&
        !message.content.startsWith('lisa global')
      ) {
        return;
      }

      const messageParts = message.content.split(' ');
      console.log('messageCreate', messageParts.length, message.content);
      let command = messageParts[0].replace(',', '').toLocaleLowerCase();
      const prefix = server.prefix;
      if (command === 'lisa' || command === 'лиза') {
        command = 'lisa';
      }
      if (command !== 'lisa' && command.charAt(0) !== prefix) {
        return;
      } else if (command.charAt(0) === prefix) {
        command = command.substring(1);
      }

      let isProcessed = false;
      for (const com of commandMap) {
        let shouldProcess = false;

        if (typeof com.test === 'string') {
          if (command === com.test) {
            shouldProcess = true;
          }
        } else if (Array.isArray(com.test)) {
          if (com.test.includes(command)) {
            shouldProcess = true;
          }
        } else if (typeof com.test === 'function') {
          if (com.test(command)) {
            shouldProcess = true;
          }
        }

        if (shouldProcess) {
          const user = await this.getUser(message, server);
          const t = Translation(user.lang || server.lang);
          if (user.isBlocked) {
            return;
          }

          await com.exec(message, t, { server, user });
          isProcessed = true;
          break;
        }
      }

      if (!isProcessed) {
        const t = Translation(server.lang);
        await message.reply(t('commandNotFound'));
      }
    });
  }
}
