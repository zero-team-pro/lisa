import { Message, MessageEmbed } from 'discord.js';

import { CommandAttributes, Owner } from '../types';
import { HelpStats } from '../constants';
import { Preset } from '../models';

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

const createUserListEmbed = async (message: Message, userId: number) => {
  const presets = await getUserPresets(userId);
  const embed = new MessageEmbed().setTitle('Your preset list').setColor('FUCHSIA');

  presets.forEach((preset) => embed.addField(preset.name, preset.weights));

  return embed;
};

const createServerListEmbed = async (message: Message, serverId: string) => {
  const presets = await getServerPresets(serverId);
  const embed = new MessageEmbed().setTitle('Server preset list').setColor('FUCHSIA');

  presets.forEach((preset) => embed.addField(preset.name, preset.weights));

  return embed;
};

const commandUserList = async (message: Message, userId: number) => {
  const embed = await createUserListEmbed(message, userId);
  return await message.reply({ embeds: [embed] });
};

const commandServerList = async (message: Message, serverId: string) => {
  const embed = await createServerListEmbed(message, serverId);
  return await message.reply({ embeds: [embed] });
};

const commandList = async (message: Message, serverId: string, userId: number) => {
  const serverEmbed = await createServerListEmbed(message, serverId);
  const userEmbed = await createUserListEmbed(message, userId);
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

const commandAdd = async (message: Message, userId: number) => {
  const preset = await createPreset(message, { userId });
  if (!preset) {
    return await message.reply('Stats check error');
  }

  const embed = new MessageEmbed().setTitle('Preset created').setColor('FUCHSIA').addField(preset.name, preset.weights);

  return await message.reply({ embeds: [embed] });
};

const commandServerAdd = async (message: Message, serverId: string) => {
  const preset = await createPreset(message, { serverId });
  if (!preset) {
    return await message.reply('Stats check error');
  }

  const embed = new MessageEmbed()
    .setTitle('Preset created for server')
    .setColor('FUCHSIA')
    .addField(preset.name, preset.weights);

  return await message.reply({ embeds: [embed] });
};

const deletePreset = async (message: Message, owner: Owner): Promise<boolean> => {
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

const commandDelete = async (message: Message, userId: number) => {
  const isPresetDeleted = await deletePreset(message, { userId });
  if (!isPresetDeleted) {
    return await message.reply('Preset not found');
  }

  return await message.reply('Preset deleted');
};

const commandServerDelete = async (message: Message, serverId: string) => {
  const isPresetDeleted = await deletePreset(message, { serverId });
  if (!isPresetDeleted) {
    return await message.reply('Preset not found');
  }

  return await message.reply('Preset deleted');
};

export const preset = async (command: string, message: Message, attr: CommandAttributes) => {
  const { server, user } = attr;

  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    return await commandList(message, server.id, user.id);
  }

  const subCommand = messageParts[1];

  if (subCommand === 'list') {
    return await commandList(message, server.id, user.id);
  } else if (subCommand === 'myList') {
    return await commandUserList(message, user.id);
  } else if (subCommand === 'serverList') {
    return await commandServerList(message, server.id);
  } else if (subCommand === 'add') {
    return await commandAdd(message, user.id);
  } else if (subCommand === 'serverAdd') {
    return await commandServerAdd(message, server.id);
  } else if (subCommand === 'rm') {
    return await commandDelete(message, user.id);
  } else if (subCommand === 'serverRm') {
    return await commandServerDelete(message, server.id);
  }

  await message.reply('TBD: help preset');
};
