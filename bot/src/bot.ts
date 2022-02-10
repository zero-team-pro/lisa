import { Client as DiscordClient, Intents, Message } from 'discord.js';
import { readFileSync } from 'fs';
import { createClient } from 'redis';
import { Shard } from 'discord-cross-hosting';

const Cluster = require('discord-hybrid-sharding');

require('dotenv').config();

import commands from './commands';
import { Channel, sequelize, Server, User } from './models';
import { CommandMap } from './types';
import Translation from './translation';

const { REDIS_HOST, REDIS_PORT, REDIS_USER, REDIS_PASSWORD, SHARD_ID } = process.env;

const client = new DiscordClient({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
  // shards: Number.parseInt(SHARD_ID),
  shards: Cluster.data.SHARD_LIST,
  shardCount: Cluster.data.TOTAL_SHARDS,
});

(client as any).cluster = new Cluster.Client(client);

(client as any).machine = new Shard((client as any).cluster);

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

client.once('ready', async () => {
  let isDatabaseOk = true;
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection has been established successfully.');
    !!process.env.DB_FORCE && console.log('FORCE recreating database');
    await sequelize.sync({ alter: true, force: !!process.env.DB_FORCE });
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

  setInterval(() => {
    (client as any).machine.request({ ack: true, message: 'Are you alive?' }).then((e) => console.log(e));
  }, 10000);

  (client as any).machine
    .broadcastEval(`this.guilds.cache.size`)
    .then((results) => {
      console.log('this.guilds.cache.size RESULT: ', results);
    })
    .catch((e) => console.log(e));

  // client.shard
  //   .broadcastEval((shardClient) => {
  //     const shardChannel = shardClient.channels.cache.get(process.env.MAIN_CHANNEL_ID);
  //     console.log('THIS SHARD CHANNEL: ', shardChannel);
  //     return shardChannel;
  //   })
  //   .then((result) => {
  //     console.log('CHANNEL: ', result);
  //   });

  const welcomeMessage = isDatabaseOk ? 'Лиза проснулась' : 'Лиза проснулась без базы данных';

  // (channel as any).send(welcomeMessage);
});

(client as any).cluster.on('message', (message) => {
  if (!message._sRequest) return;
  if (message.guildId && !message.eval) {
    const guild = client.guilds.cache.get(message.guildId);
    const customguild = {} as any;
    customguild.id = guild.id;
    customguild.name = guild.name;
    customguild.icon = guild.icon;
    customguild.ownerId = guild.ownerId;
    customguild.roles = [...guild.roles.cache.values()];
    customguild.channels = [...guild.channels.cache.values()];
    message.reply({ data: customguild });
  }
});

const getUser = async (message: Message, server: Server) => {
  const [user] = await User.findOrCreate({
    where: { discordId: message.author.id, serverId: message.guild.id },
    defaults: { discordId: message.author.id, serverId: server.id },
  });
  return user;
};

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

client.on('messageCreate', async (message) => {
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

  /* ===== TEST BEGIN ===== */
  const result = await (client as any).machine.broadcastEval((shardClient) => {
    return shardClient.channels.cache.get(process.env.MAIN_CHANNEL_ID);
  });
  // console.log('CHANNELS length: ', result.length);
  console.log('CHANNELS: ', result);
  // console.log('SHARD id: ', client.shard.ids);
  // console.log('SHARD count: ', client.shard.count);

  if (message.content === '+ping') {
    const results = await Promise.all([
      (client as any).machine.fetchClientValues('guilds.cache.size'),
      (client as any).machine.broadcastEval((c) => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
    ]);

    const totalGuilds = results[0].reduce((acc, guildCount) => {
      if (typeof acc !== 'number' || typeof guildCount !== 'number') {
        return;
      }
      return acc + guildCount;
    }, 0);
    const totalMembers = results[1].reduce((acc, memberCount) => acc + memberCount, 0);
    await message.reply(`Server count: ${totalGuilds}\nMember count: ${totalMembers}`);
  }

  if (message.content === '+ping') {
    // client.shard.
  }
  /* ===== TEST END ===== */

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
      const user = await getUser(message, server);
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

client.login(process.env.DISCORD_TOKEN);
