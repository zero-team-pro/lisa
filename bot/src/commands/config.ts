import { Message, MessageEmbed } from 'discord.js';
import { italic } from '@discordjs/builders';

import { Server } from '../models';

const commandScan = async (message: Message) => {
  const discordChannels = await message.guild.channels.fetch();
  const allChannels = discordChannels
    .filter((channel) => channel.type === 'GUILD_TEXT')
    .map((channel) => `${channel.toString()} (${italic(channel.id)})`);

  const embed = new MessageEmbed()
    .setTitle('Channels')
    .addFields({ name: 'All channels', value: allChannels.join('\n') });

  await message.reply({ embeds: [embed] });
};

const commandPrefix = async (message: Message) => {
  const messageParts = message.content.split(' ');
  const params = messageParts.length > 2 ? messageParts.slice(2) : [];

  if (params.length > 1) {
    await message.reply('Wrong params');
    return;
  }
  try {
    const server = await Server.findByPk(message.guild.id);
    if (params.length === 0) {
      await message.reply(`This server prefix: "${server.prefix}"`);
      return;
    }
    if (params[0].length !== 1) {
      await message.reply(`Server prefix should be just one symbol.`);
      return;
    }
    server.prefix = params[0];
    await server.save();
    await message.reply(`Server prefix changed to: "${server.prefix}"`);
  } catch (err) {
    await message.reply('DB error');
    return;
  }
};

export const processConfigCommand = async (message: Message) => {
  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    await message.reply('TBD: help config');
    return;
  }
  const command = messageParts[1].replace(',', '').toLocaleLowerCase();

  if (command === 'scan') {
    await commandScan(message);
  } else if (command === 'prefix') {
    await commandPrefix(message);
  }
};
