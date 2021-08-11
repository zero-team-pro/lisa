const { Client, Intents } = require('discord.js');

require('dotenv').config({ path: '../.env' });

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
  console.log('Ready!');
  const channel = client.channels.cache.get(process.env.MAIN_CHANNEL_ID);
  channel.send('Лиза проснулась');
});

client.on('interactionCreate', async (interaction) => {
  console.log(Object.keys(interaction));
  if (!interaction.isCommand()) return;
  console.log(interaction.commandName);

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong.');
  } else if (interaction.commandName === 'beep') {
    await interaction.reply('Boop!');
  }
  // ...
});

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
  }
});

client.login(process.env.DISCORD_TOKEN);
