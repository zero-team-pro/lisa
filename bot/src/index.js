const { Client, Intents, MessageEmbed } = require('discord.js');
const axios = require('axios').default;

require('dotenv').config({ path: '../.env' });

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
  console.log('Ready!');
  const channel = client.channels.cache.get(process.env.MAIN_CHANNEL_ID);
  channel.send('Лиза проснулась');
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

client.on('messageCreate', async (message) => {
  const messageParts = message.content.split(' ');
  console.log('messageCreate', messageParts.length, message.content);
  const command = messageParts[0];

  if (command === 'ping') {
    await message.reply('Pong!');
  } else if (command === 'beep') {
    await message.reply('Boop!');
  } else if (command === 'server') {
    await message.reply(`Server name: ${message.guild.name}\nTotal members: ${message.guild.memberCount}`);
  } else if (command === 'help') {
    axios
      .get('http://192.168.88.32:4000/help')
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
