import { Client as DiscordClient, Intents, Message } from 'discord.js';
import { readFileSync } from 'fs';
import { createClient } from 'redis';

require('dotenv').config();

import commands from '../commands';
import { Channel, sequelize, Server, User } from '../models';
import { CommandMap, IBridgeRequest, IBridgeResponse, IJsonRequest } from '../types';
import Translation from '../translation';
import { Bridge } from './bridge';

const { DB_FORCE, REDIS_HOST, REDIS_PORT, REDIS_USER, REDIS_PASSWORD } = process.env;

let redisCa;
let redisCert;
let redisKey;
try {
  redisCert = readFileSync('/certs/client.crt', { encoding: 'utf-8' });
  redisKey = readFileSync('/certs/client.key', { encoding: 'utf-8' });
  redisCa = readFileSync('/certs/ca.crt', { encoding: 'utf-8' });
} catch (err) {
  console.error('Reading certs error:', err);
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
  private bridge: Bridge;
  private shardId: number;

  constructor(bridge: Bridge, shardId: number, shardCount: number) {
    this.bridge = bridge;

    this.shardId = shardId;
    this.client = Bot.createClient(shardId, shardCount);
    // TODO: async in init
    this.onReady();
    this.onMessageCreate();
  }

  public login(discordToken: string) {
    return this.client.login(discordToken);
  }

  private static createClient(shardId: number, shardCount: number) {
    return new DiscordClient({
      intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
      shards: shardId,
      shardCount,
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

      this.bridge.request('gateway', { method: 'alive' });
      this.bridge.bindGlobalQueue();
      this.bridge.receiveMessages(this.onBridgeRequest);

      const channel = this.client.channels.cache.get(process.env.MAIN_CHANNEL_ID);
      if (channel && channel.type === 'GUILD_TEXT') {
        const welcomeMessage = isDatabaseOk ? 'Лиза проснулась' : 'Лиза проснулась без базы данных';

        channel.send(welcomeMessage + ` (Shard Id: ${this.shardId})`);
      }
    });
  }

  private onBridgeRequest = (message: IJsonRequest) => {
    if (message.method === 'stats') {
      return this.methodStats(message);
    } else if (message.method === 'guildList') {
      return this.methodGuildList(message);
    } else if (message.method === 'guild') {
      return this.methodGuild(message);
    } else if (message.method === 'guildChannelList') {
      return this.methodGuildChannelList(message);
    } else if (message.method === 'guildChannel') {
      return this.methodGuildChannel(message);
    } else {
      return console.warn(` [RMQ shard] Method ${message.method} not found;`);
    }
  };

  private methodStats = (message: IJsonRequest) => {
    const guildCount = this.client.guilds.cache.size;
    const res = { result: { guildCount } };
    this.bridge.response(message.from, message.id, res);
  };

  private methodGuildList = async (message: IJsonRequest) => {
    // TODO: Types
    const guildIdList: string[] = message.params;
    // TODO: Replace with cache or use RR or save to DB with cron
    const guildList = await Promise.all(guildIdList.map((guildId) => this.client.guilds.fetch(guildId)));
    this.bridge.response(message.from, message.id, { result: guildList });
  };

  private methodGuild = async (message: IJsonRequest) => {
    // TODO: Types
    const guildId: string = message.params;
    const guild = await this.client.guilds.cache.get(guildId);
    const result = guild?.shardId === this.shardId ? guild : null;
    this.bridge.response(message.from, message.id, { result: result });
  };

  private methodGuildChannelList = async (message: IJsonRequest) => {
    // TODO: Types
    const guildId: string = message.params;
    const guild = await this.client.guilds.cache.get(guildId);
    if (guild?.shardId !== this.shardId) {
      return this.bridge.response(message.from, message.id, { result: null });
    }
    const channelList = await guild.channels.fetch();
    const result = channelList.map((channel) => ({
      ...channel,
      permissionList: channel.permissionsFor(guild.me).toArray(),
    }));
    this.bridge.response(message.from, message.id, { result: result });
  };

  private methodGuildChannel = async (message: IJsonRequest) => {
    // TODO: Types
    const guildId: string = message.params.guildId;
    const channelId: string = message.params.channelId;

    const guild = await this.client.guilds.cache.get(guildId);
    if (guild?.shardId !== this.shardId) {
      return this.bridge.response(message.from, message.id, { result: null });
    }

    const channel = await this.client.channels.fetch(channelId);
    const result = {
      ...channel,
      permissionList: channel.type !== 'DM' ? channel.permissionsFor(guild.me).toArray() : null,
    };
    this.bridge.response(message.from, message.id, { result: result });
  };

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

      if (command === 'stats') {
        message.reply('Searching stats...');
        const statsRes = await this.bridge.requestGlobal({ method: 'stats' });
        const statList = statsRes.map((res) => `Shard: ${res?.from}, Guild count: ${res?.result?.guildCount}`);
        await message.reply(statList.join('\n'));
        return;
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
