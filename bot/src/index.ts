import { Channel, Client, ColorResolvable, Intents, Message, MessageEmbed } from 'discord.js';
import axios from 'axios';

import { IRaterReply } from './types';

require('dotenv').config();

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const request = axios.create({
  baseURL: process.env.RATER_HOST || 'http://192.168.88.32:4000',
  headers: {
    'Content-Type': 'application/json',
  },
});

client.once('ready', () => {
  console.log('Ready!');
  const channel = client.channels.cache.get(process.env.MAIN_CHANNEL_ID);
  (channel as any).send('Лиза проснулась');
});

const RATER_COMMANDS = ['sets', 'help'];

const convertReply = (reply: IRaterReply) => {
  if (reply.type === 'embed') {
    const embed = new MessageEmbed();

    reply.title && embed.setTitle(reply.title);
    reply.description && embed.setDescription(reply.description);
    reply.color && embed.setColor(reply.color);
    reply.fields && reply.fields.forEach((field) => embed.addField(field.name, field.value, field.inline));

    return { embeds: [embed] };
  }
  if (reply.type === 'text') {
    return reply.text;
  }
  return 'Функционал доступен, но временно не очень.';
};

const getMessageData = (message: Message) => {
  return {
    content: message.content,
    authorId: message.author.id,
    guildId: message.guild.id,
    userName: message.author.username,
    guildName: message.guild.name,
    isAdmin: message.member.permissions.has('ADMINISTRATOR'),
    attachmentUrl: message.attachments.first()?.url,
  };
};

client.on('messageCreate', async (message) => {
  if (message.author.bot) {
    return;
  }
  if (message.channel.id !== process.env.MAIN_CHANNEL_ID) {
    return;
  }

  const messageParts = message.content.split(' ');
  console.log('messageCreate', messageParts.length, message.content);
  const command = messageParts[0];
  const params = messageParts.length > 1 ? messageParts.slice(1) : [];

  if (command === 'ping') {
    await message.reply('Pong!');
  } else if (RATER_COMMANDS.includes(command)) {
    request
      .post(`/${command}`, getMessageData(message))
      .then(async (res) => {
        await message.reply(convertReply(res.data));
      })
      .catch(async (err) => {
        console.log(err);
        await message.reply('Функционал временно не доступен.');
      });
  } else if (command === 'user' || command === 'server') {
    request
      .post('/config', getMessageData(message))
      .then(async (res) => {
        await message.reply(convertReply(res.data));
      })
      .catch(async (err) => {
        console.log(err);
        await message.reply('Функционал временно не доступен.');
      });
  } else if (command === 'rate') {
    request
      .post('/rate', getMessageData(message))
      .then(async (res) => {
        await message.reply(convertReply(res.data));
      })
      .catch(async (err) => {
        console.log(err);
        await message.reply('Функционал временно не доступен.');
      });
  }
});

client.login(process.env.DISCORD_TOKEN);
