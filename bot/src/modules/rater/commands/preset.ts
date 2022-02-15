import { Message, MessageEmbed } from 'discord.js';

import { CommandAttributes, Owner, TFunc } from '../../../types';
import { HelpStats } from '../../../constants';
import { Preset, User } from '../../../models';
import { helpEmbed, isAdmin } from '../../../utils';

const getStatWeight = (param: string) => {
  const [stat, weight, ...rest] = param.split('=');
  console.log(stat, weight, rest);

  if (rest.length !== 0) {
    return null;
  }

  const isStat = Object.values<string>(HelpStats).includes(stat);
  if (!isStat) {
    return null;
  }

  const weightNumber = Number.parseFloat(weight);
  if (isNaN(weightNumber) || weightNumber < 0 || weightNumber > 1) {
    return null;
  }

  return { stat, weight };
};

const getUserPresets = (userId: number) =>
  Preset.findAll({
    where: {
      userId: userId,
    },
  });

const getServerPresets = (serverId: string) =>
  Preset.findAll({
    where: {
      serverId: serverId,
    },
  });

const createUserListEmbed = async (message: Message, t: TFunc, userId: number) => {
  const presets = await getUserPresets(userId);
  const embed = new MessageEmbed().setTitle(t('preset.userPresetTitle')).setColor('FUCHSIA');

  presets.forEach((preset) => embed.addField(preset.name, preset.weights));

  return embed;
};

const createServerListEmbed = async (message: Message, t: TFunc, serverId: string) => {
  const presets = await getServerPresets(serverId);
  const embed = new MessageEmbed().setTitle(t('preset.userPresetTitle')).setColor('FUCHSIA');

  presets.forEach((preset) => embed.addField(preset.name, preset.weights));

  return embed;
};

const commandUserList = async (message: Message, t: TFunc, userId: number) => {
  const embed = await createUserListEmbed(message, t, userId);
  return await message.reply({ embeds: [embed] });
};

const commandServerList = async (message: Message, t: TFunc, serverId: string) => {
  const embed = await createServerListEmbed(message, t, serverId);
  return await message.reply({ embeds: [embed] });
};

const commandList = async (message: Message, t: TFunc, serverId: string, userId: number) => {
  const serverEmbed = await createServerListEmbed(message, t, serverId);
  const userEmbed = await createUserListEmbed(message, t, userId);
  return await message.reply({ embeds: [serverEmbed, userEmbed] });
};

const createPreset = async (message: Message, owner: Owner): Promise<Preset | null> => {
  const messageParts = message.content.split(' ');
  const params = messageParts.slice(2);
  const name = params[0];
  const weights = params.slice(1);

  const stats = weights.map((param) => getStatWeight(param));
  if (stats.length === 0 || stats.filter((el) => el === null).length !== 0) {
    return null;
  }

  return await Preset.create({ name, weights: weights.join(' '), ...owner });
};

const commandAdd = async (message: Message, t: TFunc, userId: number) => {
  const preset = await createPreset(message, { userId });
  if (!preset) {
    return await message.reply(t('preset.statsError'));
  }

  const embed = new MessageEmbed()
    .setTitle(t('preset.userCreatedTitle'))
    .setColor('FUCHSIA')
    .addField(preset.name, preset.weights);

  return await message.reply({ embeds: [embed] });
};

const commandServerAdd = async (message: Message, t: TFunc, serverId: string, user: User) => {
  if (!isAdmin(user, message)) {
    return await message.reply(t('notAdminError'));
  }

  const preset = await createPreset(message, { serverId });
  if (!preset) {
    return await message.reply(t('preset.statsError'));
  }

  const embed = new MessageEmbed()
    .setTitle(t('preset.serverCreatedTitle'))
    .setColor('FUCHSIA')
    .addField(preset.name, preset.weights);

  return await message.reply({ embeds: [embed] });
};

const deletePreset = async (message: Message, t: TFunc, owner: Owner): Promise<boolean> => {
  const messageParts = message.content.split(' ');
  const name = messageParts[2];

  const preset = await Preset.findOne({
    where: {
      name,
      ...owner,
    },
  });
  if (!preset) {
    return false;
  }

  await preset.destroy();
  return true;
};

const commandDelete = async (message: Message, t: TFunc, userId: number) => {
  const isPresetDeleted = await deletePreset(message, t, { userId });
  if (!isPresetDeleted) {
    return await message.reply(t('preset.notFound'));
  }

  return await message.reply(t('preset.deleted'));
};

const commandServerDelete = async (message: Message, t: TFunc, serverId: string, user: User) => {
  if (!isAdmin(user, message)) {
    return await message.reply(t('notAdminError'));
  }

  const isPresetDeleted = await deletePreset(message, t, { serverId });
  if (!isPresetDeleted) {
    return await message.reply(t('preset.notFound'));
  }

  return await message.reply(t('preset.deleted'));
};

export const preset = async (message: Message, t: TFunc, attr: CommandAttributes) => {
  const { server, user } = attr;

  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    return await commandList(message, t, server.id, user.id);
  }

  const subCommand = messageParts[1];

  if (subCommand === 'list') {
    return await commandList(message, t, server.id, user.id);
  } else if (subCommand === 'myList') {
    return await commandUserList(message, t, user.id);
  } else if (subCommand === 'serverList') {
    return await commandServerList(message, t, server.id);
  } else if (subCommand === 'add') {
    return await commandAdd(message, t, user.id);
  } else if (subCommand === 'serverAdd') {
    return await commandServerAdd(message, t, server.id, user);
  } else if (subCommand === 'rm') {
    return await commandDelete(message, t, user.id);
  } else if (subCommand === 'serverRm') {
    return await commandServerDelete(message, t, server.id, user);
  }

  await helpEmbed(message, t, t('help.preset', { p: server.prefix }));
};
