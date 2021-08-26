import { Message, MessageEmbed } from 'discord.js';
import { Op } from 'sequelize';

import { RaterCall } from '../models';
import { CommandAttributes, TFunc } from '../types';
import { helpEmbed } from '../helpers';

const getRaterCallsToday = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await RaterCall.count({
    where: {
      time: {
        [Op.gte]: today,
      },
    },
  });
};

const getRaterCallsYesterday = async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await RaterCall.count({
    where: {
      time: {
        [Op.gte]: yesterday,
        [Op.lt]: today,
      },
    },
  });
};

const createReply = async (t: TFunc) => {
  const embed = new MessageEmbed().setTitle(t('info.raterTitle')).setDescription(t('info.raterDescription'));

  const raterCallsToday = await getRaterCallsToday();
  const raterCallsYesterday = await getRaterCallsYesterday();

  embed.addField(t('today'), t('info.raterToday', { calls: raterCallsToday }));
  embed.addField(t('yesterday'), t('info.raterYesterday', { calls: raterCallsYesterday }));

  return { embeds: [embed] };
};

export const info = async (message: Message, t: TFunc, attr: CommandAttributes) => {
  const messageParts = message.content.split(' ');
  const subcommand = messageParts[1];

  if (subcommand === 'rater') {
    return message.reply(await createReply(t));
  }

  return helpEmbed(message, t, t('help.info', { p: attr.server.prefix }));
};
