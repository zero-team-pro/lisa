import { Channel, Client, Intents, Message, MessageEmbed } from 'discord.js';
import axios from 'axios';

require('dotenv').config({ path: '../.env' });

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const request = axios.create({
  baseURL: process.env.RATER_HOST || 'http://192.168.88.32:4000',
  headers: {
    'Content-Type': 'application/json'
  }
});


client.once('ready', () => {
  console.log('Ready!');
  const channel = client.channels.cache.get(process.env.MAIN_CHANNEL_ID);
  (channel as any).send('Лиза проснулась');
});

const convertReply = (reply) => {
  if (reply.type === 'embed') {
    const embed = new MessageEmbed();
    reply.title && embed.setTitle(reply.title);
    reply.description && embed.setDescription(reply.description);
    reply.color && embed.setColor(reply.color);
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
  } else if (command === 'beep') {
    await message.reply('Boop!');
  } else if (command === 'server') {
    await message.reply(`Server name: ${message.guild.name}\nTotal members: ${message.guild.memberCount}`);
  } else if (command === 'help') {
    request
      .post('/help', getMessageData(message))
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
