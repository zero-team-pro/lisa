import { Message, MessageEmbed } from 'discord.js';

import { User } from '../models';
import { CommandAttributes, TFunc } from '../types';
import {
  getRaterCallsToday,
  getRaterCallsYesterday,
  getRaterLimitToday,
  getRaterLimitYesterday,
  helpEmbed,
} from '../utils';

const commandGlobal = async (t: TFunc) => {
  const embed = new MessageEmbed().setTitle(t('info.raterTitle')).setDescription(t('info.raterDescription'));

  // TODO: Rater calls by engine
  const raterCallsToday = await getRaterCallsToday();
  const raterCallsYesterday = await getRaterCallsYesterday();

  embed.addField(t('today'), t('info.raterToday', { calls: raterCallsToday }));
  embed.addField(t('yesterday'), t('info.raterYesterday', { calls: raterCallsYesterday }));

  return { embeds: [embed] };
};

const commandMe = async (user: User, t: TFunc) => {
  const embed = new MessageEmbed().setTitle(t('info.raterTitle')).setDescription(t('info.raterDescription'));

  const raterCallsToday = await getRaterLimitToday(user.id);
  const raterCallsYesterday = await getRaterLimitYesterday(user.id);
  const limit = user.raterLimit;

  embed.addField(t('today'), t('info.raterCostToday', { cost: raterCallsToday, limit }));
  embed.addField(t('yesterday'), t('info.raterCostYesterday', { cost: raterCallsYesterday, limit }));

  return { embeds: [embed] };
};

export const info = async (message: Message, t: TFunc, attr: CommandAttributes) => {
  const messageParts = message.content.split(' ');
  const subcommand = messageParts[1];

  if (subcommand === 'global') {
    return message.reply(await commandGlobal(t));
  } else if (subcommand === 'me') {
    return message.reply(await commandMe(attr.user, t));
  }

  return helpEmbed(message, t, t('help.info', { p: attr.server.prefix }));
};
