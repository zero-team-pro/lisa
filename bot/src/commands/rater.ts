import { Message, MessageAttachment, MessageEmbed } from 'discord.js';
import axios from 'axios';

import { Preset, RaterCall, Server, User } from '../models';
import { CommandAttributes, RaterEngine, IRaterReply, IRaterStat, TFunc } from '../types';
import { Language, RaterCost } from '../constants';
import { translationEnglish } from '../localization';
import { getRaterLimitToday } from '../helpers';

const request = axios.create({
  baseURL: process.env.RATER_HOST || 'http://rater',
  headers: {
    'Content-Type': 'application/json',
  },
});

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

const getMessageData = (message: Message, raterLang: Language, preset: Preset | null, raterEngine: RaterEngine) => {
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
    engine: raterEngine,
  };
};

type LangElem = keyof typeof translationEnglish.elem;

const statKeyToLang = (stat: IRaterStat, t: TFunc) => {
  const isPercentage = stat.key.slice(-1) === '%';
  const statMain = stat.key.replace('%', '') as LangElem;
  return `${t(`elem.${statMain}`)}: ${stat.value}${isPercentage ? '%' : ''}`;
};

const convertReply = async (reply: IRaterReply, t: TFunc, attr: CommandAttributes, raterEngine: RaterEngine) => {
  console.log('Rater reply: ', JSON.stringify(reply));

  if (reply.status === 'ok') {
    await RaterCall.create({ userId: attr.user.id, rater: raterEngine });

    const embed = new MessageEmbed().setTitle(t('rater.title', { level: reply.level })).setColor(reply.color);

    const stats = reply.stats.map((stat) => {
      return statKeyToLang(stat, t);
    });
    embed.addField(statKeyToLang(reply.mainStat, t), stats.join('\n') || 'null');

    embed.addField(
      t('rater.score', { score: reply.score }),
      `${t('rater.mainScore', { score: reply.mainScore })}
      ${t('rater.subScore', { score: reply.subScore })}`,
    );

    const limitToday = await getRaterLimitToday(attr.user.id);
    embed.addField(t('rater.engine'), `${raterEngine}`);
    embed.addField(t('rater.callsToday'), `${limitToday}/${attr.user.raterLimit} (+${RaterCost[raterEngine]})`);

    return { embed: embed };
  } else if (reply.status === 'error') {
    const embed = new MessageEmbed().setTitle(t('error')).setDescription(reply.text);
    return { embed: embed };
  } else if (reply.status === 'image') {
    const buff = Buffer.from(reply.image, 'base64');
    const file = new MessageAttachment(buff, 'raterDebug.png');
    const embed = new MessageEmbed()
      .setTitle('Image')
      .setImage('attachment://raterDebug.png')
      .setDescription(reply.text);

    return { embed: embed, file: file };
  }

  const embed = new MessageEmbed().setTitle(t('error')).setDescription(t('external.processingError'));
  return { embed: embed };
};

export const processRaterCommand = async (message: Message, t: TFunc, attr: CommandAttributes) => {
  const messageParts = message.content.split(' ');
  const { user, server } = attr;
  const raterLang = user.raterLang || server.raterLang;
  const raterEngines = (user.raterEngine || server.raterEngine).split('+');

  const raterCallsToday = await getRaterLimitToday(user.id);
  if (raterCallsToday >= user.raterLimit) {
    return await message.reply(t('rater.limitReached'));
  }

  let preset = null;
  const presetName = messageParts[1];
  if (presetName) {
    preset = await findPreset(presetName, user, server);
  }

  const replies = await Promise.all(
    raterEngines.map(async (engine: RaterEngine) => {
      const sendingData = getMessageData(message, raterLang, preset, engine);
      console.log('Rater sending: ', JSON.stringify(sendingData));

      return await request
        .post('/rate', sendingData)
        .then(async (res) => {
          return await convertReply(res.data, t, attr, engine);
        })
        .catch(async (err) => {
          console.log(err);
          const embed = new MessageEmbed().setTitle(t('error')).setDescription(t('external.notAvailable'));
          return { embed: embed };
        });
    }),
  );

  const embeds = replies.map((reply) => reply.embed);
  // TODO: fix
  const files = [];

  await message.reply({ embeds, files });
};
