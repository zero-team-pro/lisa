import { ChannelType, EmbedBuilder, Message } from 'discord.js';
import { italic } from '@discordjs/builders';

import { Channel, Server, User } from '@/models';
import { TFunc } from '@/types';
import { helpEmbed, isAdmin } from '@/utils';
import { DiscordMessage } from '@/controllers/discordMessage';

const methodName = 'config';

const getChannelsEmbed = async (message: Message, t: TFunc) => {
  const discordChannels = await message.guild.channels.fetch();
  const allChannels = discordChannels
    .filter((channel) => channel.type === ChannelType.GuildText)
    .map((channel) => `${channel.toString()} (${italic(channel.id)})`);

  const enabledChannelsDb = await Channel.findAll({
    where: {
      id: discordChannels.filter((channel) => channel.type === ChannelType.GuildText).map((channel) => channel.id),
      isEnabled: true,
    },
  });
  const enabledChannelIds = enabledChannelsDb.map((channel) => channel.id);
  const enabledChannels = discordChannels
    .filter((channel) => channel.type === ChannelType.GuildText)
    .filter((channel) => enabledChannelIds.includes(channel.id))
    .map((channel) => `${channel.toString()} (${italic(channel.id)})`);

  return new EmbedBuilder()
    .setTitle(t('config.channels.title'))
    .addFields({ name: t('config.channels.all'), value: allChannels.join('\n') })
    .addFields({
      name: t('config.channels.enabledList'),
      value: enabledChannels.length > 0 ? enabledChannels.join('\n') : t('none'),
    });
};

const commandScan = async (message: Message, t: TFunc) => {
  const discordChannels = await message.guild.channels.fetch();
  const channelIds = discordChannels
    .filter((channel) => channel.type === ChannelType.GuildText)
    .map((channel) => channel.id);

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

  const embed = await getChannelsEmbed(message, t);
  embed.addFields({ name: t('config.channels.count'), value: newChannels.length.toString() });

  await message.reply({ embeds: [embed] });
};

const commandPrefix = async (message: Message, t: TFunc, server: Server, user: User) => {
  if (!isAdmin(user, message)) {
    return await message.reply(t('notAdminError'));
  }

  const messageParts = message.content.split(' ');
  const params = messageParts.slice(2);

  if (params.length > 1) {
    await message.reply(t('wrongParams'));
    return;
  }
  if (params.length === 0) {
    await message.reply(t('config.prefix.server', { prefix: server.prefix }));
    return;
  }
  if (params[0].length !== 1) {
    await message.reply(t('config.prefix.oneSymbol'));
    return;
  }
  server.prefix = params[0];
  await server.save();
  await message.reply(t('config.prefix.changedTo', { prefix: server.prefix }));
};

const commandMainChannel = async (message: Message, t: TFunc, server: Server, user: User) => {
  if (!isAdmin(user, message)) {
    return await message.reply(t('notAdminError'));
  }

  const messageParts = message.content.split(' ');
  const params = messageParts.slice(2);

  if (params.length > 1) {
    await message.reply(t('wrongParams'));
    return;
  }

  if (params.length === 0) {
    if (!server.mainChannelId) {
      await message.reply(t('config.channels.noMain'));
      return;
    }
    const channel = await message.guild.channels.fetch(server.mainChannelId);
    await message.reply(
      t('config.channels.main', { channel: channel.toString(), name: channel.name, id: italic(channel.id) }),
    );
    return;
  }

  const channel = await Channel.findByPk(params[0]);
  if (!channel) {
    await message.reply(t('config.channels.cantFindInDB'));
    return;
  }
  const channelDiscord = await message.guild.channels.fetch(params[0]);
  if (!channelDiscord) {
    await message.reply(t('config.channels.cantFindInDiscord'));
    return;
  }

  server.mainChannelId = channel.id;
  await server.save();

  await message.reply(
    t('config.channels.newMain', { channel: channelDiscord.toString(), id: italic(server.mainChannelId) }),
  );
};

const changeChannelAvailability = async (message: Message, t: TFunc, params: string[], isEnabled: boolean) => {
  if (params.length !== 2) {
    await message.reply(t('wrongParams'));
  }
  const channel = await Channel.findByPk(params[1]);
  const discordChannel = await message.guild.channels.fetch(params[1]);
  if (!channel || !discordChannel) {
    await message.reply(t('config.channels.cantFindInDB'));
  }

  channel.isEnabled = isEnabled;
  await channel.save();
  await message.reply(
    t('config.channels.stateChange', {
      channel: discordChannel.toString(),
      id: channel.id,
      state: isEnabled ? t('enabled') : t('disabled'),
    }),
  );
};

const changeAllChannelsAvailability = async (message: Message, t: TFunc, isEnabled: boolean) => {
  await Channel.update({ isEnabled }, { where: { serverId: message.guildId } });

  await message.reply(
    t('config.channels.enabledAll', { state: isEnabled ? t('enabled_plural') : t('disabled_plural') }),
  );
};

const commandChannel = async (message: Message, t: TFunc, server: Server, user: User) => {
  if (!isAdmin(user, message)) {
    return await message.reply(t('notAdminError'));
  }

  const messageParts = message.content.split(' ');
  const params = messageParts.slice(2);

  if (params.length > 1) {
    await message.reply(t('wrongParams'));
    return;
  }
  if (params.length === 0 || params[0] === 'list') {
    const embed = await getChannelsEmbed(message, t);
    await message.reply({ embeds: [embed] });
    return;
  }

  if (!server.mainChannelId) {
    await message.reply(t('config.channels.noMain'));
  }

  if (params[0] === 'add') {
    await changeChannelAvailability(message, t, params, true);
  } else if (params[0] === 'rm') {
    await changeChannelAvailability(message, t, params, false);
  } else if (params[0] === 'all') {
    await changeAllChannelsAvailability(message, t, true);
  } else if (params[0] === 'none') {
    await changeAllChannelsAvailability(message, t, false);
  }
};

const commandInit = async (message: Message, t: TFunc, server: Server, user: User) => {
  if (!isAdmin(user, message)) {
    return await message.reply(t('notAdminError'));
  }

  await commandScan(message, t);

  server.mainChannelId = message.channelId;
  await server.save();

  user.isAdmin = true;
  await user.save();

  await message.reply(t('config.initComplete'));
};

const exec = async (message: DiscordMessage) => {
  const { t, server, user } = message;

  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    await helpEmbed(message.raw, t, t('help.config', { p: server?.prefix }));
    return;
  }
  const subCommand = messageParts[1].replace(',', '');

  try {
    if (subCommand === 'scan') {
      return await commandScan(message.raw, t);
    } else if (subCommand === 'prefix') {
      return await commandPrefix(message.raw, t, server, user);
    } else if (subCommand === 'mainChannel') {
      return await commandMainChannel(message.raw, t, server, user);
    } else if (subCommand === 'channel') {
      return await commandChannel(message.raw, t, server, user);
    } else if (subCommand === 'init') {
      return await commandInit(message.raw, t, server, user);
    } else {
      await message.reply(t('config.wrongParams'));
    }
  } catch (err) {
    await message.reply(t('dbError'));
    if (process.env.STAGING === 'dev') {
      console.log(err);
      await message.reply(err.toString());
    }
    return;
  }
};

export const config = { exec, methodName };
