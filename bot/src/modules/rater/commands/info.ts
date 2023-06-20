import { EmbedBuilder } from 'discord.js';

import { User } from '@/models';
import { TFunc } from '@/types';
import {
  getRaterCallsToday,
  getRaterCallsYesterday,
  getRaterLimitToday,
  getRaterLimitYesterday,
  helpEmbed,
} from '@/utils';
import { DiscordMessage } from '@/controllers/discordMessage';

const methodName = 'info';

const commandGlobal = async (t: TFunc) => {
  const embed = new EmbedBuilder().setTitle(t('info.raterTitle')).setDescription(t('info.raterDescription'));

  // TODO: Rater calls by engine
  const raterCallsToday = await getRaterCallsToday();
  const raterCallsYesterday = await getRaterCallsYesterday();

  embed.addFields({ name: t('today'), value: t('info.raterToday', { calls: raterCallsToday }) });
  embed.addFields({ name: t('yesterday'), value: t('info.raterYesterday', { calls: raterCallsYesterday }) });

  return { embeds: [embed] };
};

const commandMe = async (user: User, t: TFunc) => {
  const embed = new EmbedBuilder().setTitle(t('info.raterTitle')).setDescription(t('info.raterDescription'));

  const raterCallsToday = await getRaterLimitToday(user.id);
  const raterCallsYesterday = await getRaterLimitYesterday(user.id);
  const limit = user.raterLimit;

  embed.addFields({ name: t('today'), value: t('info.raterCostToday', { cost: raterCallsToday, limit }) });
  embed.addFields({ name: t('yesterday'), value: t('info.raterCostYesterday', { cost: raterCallsYesterday, limit }) });

  return { embeds: [embed] };
};

const exec = async (message: DiscordMessage) => {
  const { t, user, server } = message;
  const messageParts = message.content.split(' ');
  const subcommand = messageParts[1];

  if (subcommand === 'global') {
    return message.raw.reply(await commandGlobal(t));
  } else if (subcommand === 'me') {
    return message.raw.reply(await commandMe(user, t));
  }

  return helpEmbed(message.raw, t, t('help.info', { p: server.prefix }));
};

export const info = { exec, methodName };
