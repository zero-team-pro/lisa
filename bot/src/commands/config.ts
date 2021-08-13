import { Message, MessageEmbed } from 'discord.js';
import { italic } from '@discordjs/builders';

import { Channel, Server } from '../models';

const getChannelsEmbed = async (message: Message) => {
  const discordChannels = await message.guild.channels.fetch();
  const allChannels = discordChannels
    .filter((channel) => channel.type === 'GUILD_TEXT')
    .map((channel) => `${channel.toString()} (${italic(channel.id)})`);

  return new MessageEmbed().setTitle('Channels').addFields({ name: 'All channels', value: allChannels.join('\n') });
};

const commandScan = async (message: Message) => {
  const discordChannels = await message.guild.channels.fetch();
  const channelIds = discordChannels.filter((channel) => channel.type === 'GUILD_TEXT').map((channel) => channel.id);
  const channelInstances = channelIds.map((channelId) => ({ id: channelId, serverId: message.guild.id }));
  await Channel.bulkCreate(channelInstances);

  const embed = await getChannelsEmbed(message);

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

const commandMainChannel = async (message: Message) => {
  const messageParts = message.content.split(' ');
  const params = messageParts.length > 2 ? messageParts.slice(2) : [];

  if (params.length > 1) {
    await message.reply('Wrong params');
    return;
  }
  try {
    const server = await Server.findByPk(message.guild.id);

    if (params.length === 0) {
      if (!server.mainChannelId) {
        await message.reply('No main channel');
        return;
      }
      const channel = await message.guild.channels.fetch(server.mainChannelId);
      await message.reply(
        `Main channel: ${channel} (${italic(server.mainChannelId)}) (typeof ${italic(typeof server.mainChannelId)})`,
      );
      return;
    }

    const channel = await Channel.findByPk(params[0]);
    if (!channel) {
      await message.reply("Can't find channel");
      return;
    }

    // Save channel
  } catch (err) {
    await message.reply('DB error');
    return;
  }
};

const commandChannel = async (message: Message) => {
  const messageParts = message.content.split(' ');
  const params = messageParts.length > 2 ? messageParts.slice(2) : [];

  if (params.length > 1) {
    await message.reply('Wrong params');
    return;
  }
  try {
    if (params.length === 0 || params[0] === 'list') {
      const embed = await getChannelsEmbed(message);
      await message.reply({ embeds: [embed] });
      return;
    }

    const server = await Server.findByPk(message.guild.id);

    if (!server.mainChannel) {
      await message.reply('Exit');
    }

    if (params[0] === 'add') {
      await message.reply(`Server prefix changed to: "${server.prefix}"`);
    } else if (params[0] === 'rm') {
      //
    } else if (params[0] === 'all') {
      //
    } else if (params[0] === 'none') {
      //
    }
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
  const command = messageParts[1].replace(',', '');

  if (command === 'scan') {
    await commandScan(message);
  } else if (command === 'prefix') {
    await commandPrefix(message);
  } else if (command === 'mainChannel') {
    await commandMainChannel(message);
  } else if (command === 'channel') {
    await commandChannel(message);
  } else {
    await message.reply('Wrong config command/params');
  }
};
