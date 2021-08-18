import { Message, MessageEmbed } from 'discord.js';
import axios from 'axios';
import { Op } from 'sequelize';

import { Preset, RaterCall, Server, User } from '../models';
import { CommandAttributes, IRaterReply, IRaterStat, TFunc } from '../types';
import { Language } from '../constants';
import { translationEnglish } from '../localization';

const request = axios.create({
  baseURL: process.env.RATER_HOST || 'http://rater',
  headers: {
    'Content-Type': 'application/json',
  },
});

const getRaterCallsToday = async (userId: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await RaterCall.count({
    where: {
      userId,
      time: {
        [Op.gte]: today,
      },
    },
  });
};

const findPreset = async (presetName: string, user: User, server: Server) => {
  const userPreset = await Preset.findOne({
    where: {
      name: presetName,
      userId: user.id,
    },
  });

  if (userPreset) {
    return userPreset;
  }

  return await Preset.findOne({
    where: {
      name: presetName,
      serverId: server.id,
    },
  });
};

const getMessageData = (message: Message, raterLang: Language, preset: Preset | null) => {
  let content = message.content;

  if (preset) {
    const messageParts = content.split(' ');
    messageParts[1] = preset.weights;
    content = messageParts.join(' ');

    console.log(`Preset: ${preset.name} (${preset.weights})`);
  }

  return {
    content,
    attachmentUrl: message.attachments.first()?.url || null,
    lang: raterLang,
  };
};

type LangElem = keyof typeof translationEnglish.elem;

const statKeyToLang = (stat: IRaterStat, t: TFunc) => {
  const isPercentage = stat.key.slice(-1) === '%';
  const statMain = stat.key.replace('%', '') as LangElem;
  return `${t(`elem.${statMain}`)}: ${stat.value}${isPercentage ? '%' : ''}`;
};

const convertReply = async (reply: IRaterReply, t: TFunc, attr: CommandAttributes) => {
  if (reply.status === 'ok') {
    await RaterCall.create({ userId: attr.user.id });

    const embed = new MessageEmbed().setTitle(t('rater.title', { level: reply.level })).setColor(reply.color);

    const stats = reply.stats.map((stat) => {
      return statKeyToLang(stat, t);
    });
    embed.addField(statKeyToLang(reply.mainStat, t), stats.join('\n'));

    embed.addField(
      t('rater.score', { score: reply.score }),
      `${t('rater.mainScore', { score: reply.mainScore })}
      ${t('rater.subScore', { score: reply.subScore })}`,
    );

    const calls = await getRaterCallsToday(attr.user.id);
    embed.addField(t('rater.callsToday'), `${calls + 1}/${attr.user.raterLimit}`);

    return { embeds: [embed] };
  }
  if (reply.status === 'error') {
    return reply.text;
  }

  return t('external.processingError');
};

export const processRaterCommand = async (message: Message, t: TFunc, attr: CommandAttributes) => {
  const messageParts = message.content.split(' ');
  const { user, server } = attr;
  const raterLang = user.raterLang || server.raterLang;

  const raterCallsToday = await getRaterCallsToday(user.id);
  if (raterCallsToday >= user.raterLimit) {
    return await message.reply(t('rater.limitReached'));
  }

  let preset = null;
  const presetName = messageParts[1];
  if (presetName) {
    preset = await findPreset(presetName, user, server);
  }

  const sendingData = getMessageData(message, raterLang, preset);

  request
    .post('/rate', sendingData)
    .then(async (res) => {
      await message.reply(await convertReply(res.data, t, attr));
    })
    .catch(async (err) => {
      console.log(err);
      await message.reply(t('external.notAvailable'));
    });
};
