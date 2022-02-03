import { Client, Intents, Message } from 'discord.js';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

require('dotenv').config();

import commands from './commands';
import { Channel, sequelize, Server, User } from './models';
import { CommandMap } from './types';
import Translation from './translation';
import { auth, server, channel } from './api';
import authMiddleware from './middlewares/auth';

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const app = express();

client.once('ready', async () => {
  let isDatabaseOk = true;
  try {
    await sequelize.authenticate();
    console.log('Connection to PostgreSQL has been established successfully.');
    !!process.env.DB_FORCE && console.log('FORCE recreating database');
    await sequelize.sync({ alter: true, force: !!process.env.DB_FORCE });
    console.log('PostgreSQL has been updated to current models successfully.');
  } catch (error) {
    isDatabaseOk = false;
    console.error('PostgreSQL init error:', error);
  }

  console.log('Ready!');
  const channel = client.channels.cache.get(process.env.MAIN_CHANNEL_ID);

  app.set('discord', client);

  const welcomeMessage = isDatabaseOk ? 'Лиза проснулась' : 'Лиза проснулась без базы данных';

  (channel as any).send(welcomeMessage);
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

/* API Express */

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
