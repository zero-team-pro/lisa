import { Client, Intents } from 'discord.js';

import { processConfigCommand, processRaterCommand } from './commands';
import { Channel, sequelize, Server } from './models';

require('dotenv').config();

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', async () => {
  let isDatabaseOk = true;
  try {
    await sequelize.authenticate();
    console.log('Connection to PostgreSQL has been established successfully.');
    await sequelize.sync({ alter: true, force: !!process.env.DB_FORCE });
    console.log('PostgreSQL has been updated to current models successfully.');
  } catch (error) {
    isDatabaseOk = false;
    console.error('PostgreSQL init error:', error);
  }

  console.log('Ready!');
  const channel = client.channels.cache.get(process.env.MAIN_CHANNEL_ID);

  const welcomeMessage = isDatabaseOk ? 'Лиза проснулась' : 'Лиза проснулась без амбуляра';

  (channel as any).send(welcomeMessage);
});

const RATER_COMMANDS = ['sets', 'help', 'rate'];

client.on('messageCreate', async (message) => {
  if (message.author.bot) {
    return;
  }
  if (message.channel.id !== process.env.MAIN_CHANNEL_ID) {
    return;
  }

  const messageParts = message.content.split(' ');
  console.log('messageCreate', messageParts.length, message.content);
  let command = messageParts[0].replace(',', '').toLocaleLowerCase();
  const [server] = await Server.findOrCreate({
    where: { id: message.guild.id },
    defaults: { id: message.guild.id },
  });
  const prefix = server.prefix;
  if (command === 'lisa' || command === 'лиза') {
    command = 'lisa';
  }
  if (command !== 'lisa' && command.charAt(0) !== prefix) {
    return;
  } else if (command.charAt(0) === prefix) {
    command = command.substring(1);
  }

  if (command === 'ping') {
    await message.reply('Pong!');
  } else if (RATER_COMMANDS.includes(command)) {
    await processRaterCommand(command, message);
  } else if (command === 'user' || command === 'server') {
    await processRaterCommand('config', message);
  } else if (command === 'lisa') {
    if (messageParts.length === 1) {
      await message.reply('Слушаю');
      return;
    }
    command = messageParts[1].replace(',', '').toLocaleLowerCase();
    const params = messageParts.length > 2 ? messageParts.slice(2) : [];
  } else if (command === 'config') {
    await processConfigCommand(message);
  } else if (command === 'debug') {
    const server = await Server.findByPk(message.guild.id, { include: Channel });
    // const channels = await server.getChannels();
    await message.reply(
      `Server JSON: ${JSON.stringify(server.toJSON())}. Channels: ${typeof server.channels} ${server.channels}`,
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
