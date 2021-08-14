import { Message, MessageEmbed } from 'discord.js';
import { bold, italic } from '@discordjs/builders';

import { Channel, Server, User } from '../models';
import { CommandAttributes } from '../types';

const getChannelsEmbed = async (message: Message) => {
  const discordChannels = await message.guild.channels.fetch();
  const allChannels = discordChannels
    .filter((channel) => channel.type === 'GUILD_TEXT')
    .map((channel) => `${channel.toString()} (${italic(channel.id)})`);

  const enabledChannelsDb = await Channel.findAll({
    where: {
      id: discordChannels.filter((channel) => channel.type === 'GUILD_TEXT').map((channel) => channel.id),
      isEnabled: true,
    },
  });
  const enabledChannelIds = enabledChannelsDb.map((channel) => channel.id);
  const enabledChannels = discordChannels
    .filter((channel) => channel.type === 'GUILD_TEXT')
    .filter((channel) => enabledChannelIds.includes(channel.id))
    .map((channel) => `${channel.toString()} (${italic(channel.id)})`);

  return new MessageEmbed()
    .setTitle('Channels')
    .addFields({ name: 'All channels', value: allChannels.join('\n') })
    .addFields({ name: 'Enabled channels', value: enabledChannels.length > 0 ? enabledChannels.join('\n') : 'None' });
};

const commandScan = async (message: Message) => {
  const discordChannels = await message.guild.channels.fetch();
  const channelIds = discordChannels.filter((channel) => channel.type === 'GUILD_TEXT').map((channel) => channel.id);

  const existedChannel = await Channel.findAll({
    where: {
      id: channelIds.map((id) => id),
    },
  });
  const newChannelInstances = channelIds
    .filter((channelId) => {
      const findChannel = existedChannel.find((channel) => channel.id === channelId);
      return typeof findChannel === 'undefined';
    })
    .map((channelId) => ({ id: channelId, serverId: message.guild.id }));

  const newChannels = await Channel.bulkCreate(newChannelInstances);

  const embed = await getChannelsEmbed(message);
  embed.addFields({ name: 'New channels count', value: newChannels.length.toString() });

  await message.reply({ embeds: [embed] });
};

const commandPrefix = async (message: Message, server: Server) => {
  const messageParts = message.content.split(' ');
  const params = messageParts.slice(2);

  if (params.length > 1) {
    await message.reply('Wrong params');
    return;
  }
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
};

const commandMainChannel = async (message: Message, server: Server) => {
  const messageParts = message.content.split(' ');
  const params = messageParts.slice(2);

  if (params.length > 1) {
    await message.reply('Wrong params');
    return;
  }

  if (params.length === 0) {
    if (!server.mainChannelId) {
      await message.reply('No main channel');
      return;
    }
    const channel = await message.guild.channels.fetch(server.mainChannelId);
    await message.reply(`Main channel: ${channel} (${italic(server.mainChannelId)})`);
    return;
  }

  const channel = await Channel.findByPk(params[0]);
  if (!channel) {
    await message.reply("Can't find channel in DB");
    return;
  }
  const channelDiscord = await message.guild.channels.fetch(params[0]);
  if (!channelDiscord) {
    await message.reply("Can't find channel in Discord");
    return;
  }

  server.mainChannelId = channel.id;
  await server.save();

  await message.reply(`New main channel: ${channelDiscord.toString()} (${server.mainChannelId})`);
};

const changeChannelAvailability = async (message: Message, params: string[], isEnabled: boolean) => {
  if (params.length !== 2) {
    await message.reply('Wrong params');
  }
  const channel = await Channel.findByPk(params[1]);
  const discordChannel = await message.guild.channels.fetch(params[1]);
  if (!channel || !discordChannel) {
    await message.reply('Channel not found in Discord or DB');
  }

  channel.isEnabled = isEnabled;
  await channel.save();
  await message.reply(`Канал ${discordChannel.toString()} (${channel.id}) ${bold('включен')}`);
};

const changeAllChannelsAvailability = async (message: Message, isEnabled: boolean) => {
  await Channel.update({ isEnabled }, { where: { serverId: message.guildId } });

  await message.reply(`Все каналы находящиеся в БД ${bold(isEnabled ? 'включены' : 'выключены')}`);
};

const commandChannel = async (message: Message, server: Server) => {
  const messageParts = message.content.split(' ');
  const params = messageParts.slice(2);

  if (params.length > 1) {
    await message.reply('Wrong params');
    return;
  }
  if (params.length === 0 || params[0] === 'list') {
    const embed = await getChannelsEmbed(message);
    await message.reply({ embeds: [embed] });
    return;
  }

  if (!server.mainChannelId) {
    await message.reply('Exit');
  }

  if (params[0] === 'add') {
    await changeChannelAvailability(message, params, true);
  } else if (params[0] === 'rm') {
    await changeChannelAvailability(message, params, false);
  } else if (params[0] === 'all') {
    await changeAllChannelsAvailability(message, true);
  } else if (params[0] === 'none') {
    await changeAllChannelsAvailability(message, false);
  }
};

const commandInit = async (message: Message, server: Server, user: User) => {
  await commandScan(message);

  server.mainChannelId = message.channelId;
  await server.save();

  user.isAdmin = true;
  await user.save();

  await message.reply('Init complete');
};

export const config = async (command: string, message: Message, attr: CommandAttributes) => {
  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    await message.reply('TBD: help config');
    return;
  }
  const subCommand = messageParts[1].replace(',', '');

  const { server, user } = attr;

  try {
    if (subCommand === 'scan') {
      await commandScan(message);
    } else if (subCommand === 'prefix') {
      await commandPrefix(message, server);
    } else if (subCommand === 'mainChannel') {
      await commandMainChannel(message, server);
    } else if (subCommand === 'channel') {
      await commandChannel(message, server);
    } else if (subCommand === 'init') {
      await commandInit(message, server, user);
    } else {
      await message.reply('Wrong config command/params');
    }
  } catch (err) {
    await message.reply('DB error');
    if (process.env.STAGING === 'dev') {
      console.log(err);
      await message.reply(err.toString());
    }
    return;
  }
};
