import { ColorResolvable, Message, MessageAttachment, MessageEmbed, MessageOptions } from 'discord.js';
import axios from 'axios';

import { Preset, RaterCall, Server, User } from '../models';
import { CommandAttributes, RaterEngine, RaterApiReply, RaterStat, TFunc, RaterReply } from '../types';
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

const statKeyToLang = (stat: RaterStat, t: TFunc) => {
  const isPercentage = stat.key.slice(-1) === '%';
  const statMain = stat.key.replace('%', '') as LangElem;
  return `${t(`elem.${statMain}`)}: ${stat.value}${isPercentage ? '%' : ''}`;
};

const convertReply = async (
  reply: RaterApiReply,
  t: TFunc,
  attr: CommandAttributes,
  raterEngine: RaterEngine,
): Promise<RaterReply> => {
  console.log('Rater reply: ', JSON.stringify(reply));

  if (reply.status === 'ok') {
    await RaterCall.create({ userId: attr.user.id, rater: raterEngine });

    const stats = reply.stats.map((stat) => {
      return statKeyToLang(stat, t);
    });

    return {
      type: 'data',
      engine: raterEngine,
      color: reply.color,
      level: reply.level,
      mainStat: reply.mainStat,
      stats,
      score: reply.score,
      mainScore: reply.mainScore,
      subScore: reply.subScore,
    };
  } else if (reply.status === 'error') {
    return { type: 'error', error: reply.text };
  } else if (reply.status === 'image') {
    const buff = Buffer.from(reply.image, 'base64');
    const file = new MessageAttachment(buff, 'raterDebug.png');
    const embed = new MessageEmbed()
      .setTitle('Image')
      .setImage('attachment://raterDebug.png')
      .setDescription(reply.text);

    return { type: 'debug', embed: embed, file: file };
  }

  return { type: 'error', error: t('external.processingError') };
};

const repliesGetTitle = (replies: RaterReply[], t: TFunc, raterEngine: string): string => {
  if (replies.filter((reply) => reply.type === 'data').length > 0) {
    return t('rater.title', { engine: raterEngine });
  } else if (replies.filter((reply) => reply.type === 'debug').length > 0) {
    return 'Debug';
  }
  return 'Error';
};

const repliesGetColor = (replies: RaterReply[]): ColorResolvable | null => {
  const repliesColors = replies.map((reply) => {
    if (reply.type !== 'data') {
      return null;
    }

    return reply.color;
  });

  if (repliesColors.filter((color) => color === 'ORANGE').length > 0) {
    return 'ORANGE';
  }
  if (repliesColors.filter((color) => color === 'PURPLE').length > 0) {
    return 'PURPLE';
  }
  if (repliesColors.filter((color) => color === 'BLUE').length > 0) {
    return 'BLUE';
  }
  return null;
};

const replyToMessageOptions = async (
  replies: RaterReply[],
  t: TFunc,
  attr: CommandAttributes,
  raterEngine: string,
): Promise<MessageOptions> => {
  const debugReplies = replies.map((reply) => (reply.type === 'debug' ? reply : null)).filter((reply) => !!reply);
  if (debugReplies[0]) {
    return { embeds: [debugReplies[0].embed], files: [debugReplies[0].file] };
  }

  const embed = new MessageEmbed();

  embed.setTitle(repliesGetTitle(replies, t, raterEngine));

  const color = repliesGetColor(replies);
  color && embed.setColor(color);

  // Data
  replies.map((reply) => {
    if (reply.type === 'data') {
      embed.addField(reply.engine, t('rater.level', { level: reply.level }));

      embed.addField(statKeyToLang(reply.mainStat, t), reply.stats.join('\n') || 'null', true);

      embed.addField(
        t('rater.score', { score: reply.score }),
        `${t('rater.mainScore', { score: reply.mainScore })}
      ${t('rater.subScore', { score: reply.subScore })}`,
        true,
      );
    }
  });

  // Errors
  replies.map((reply) => {
    if (reply.type === 'error') {
      embed.addField(t('error'), reply.error);
    }
  });

  // Limits
  const limitToday = await getRaterLimitToday(attr.user.id);
  embed.addField(t('rater.callsToday'), `${limitToday}/${attr.user.raterLimit} (+${RaterCost[raterEngine]})`);

  return { embeds: [embed] };
};

export const processRaterCommand = async (message: Message, t: TFunc, attr: CommandAttributes) => {
  const messageParts = message.content.split(' ');
  const { user, server } = attr;
  const raterLang = user.raterLang || server.raterLang;
  const raterEngine = user.raterEngine || server.raterEngine;

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
    raterEngine.split('+').map(async (engine: RaterEngine): Promise<RaterReply> => {
      const sendingData = getMessageData(message, raterLang, preset, engine);
      console.log('Rater sending: ', JSON.stringify(sendingData));

      return await request
        .post('/rate', sendingData)
        .then(async (res) => {
          return await convertReply(res.data, t, attr, engine);
        })
        .catch(async (err) => {
          console.log(err);
          return { type: 'error', error: t('external.notAvailable') };
        });
    }),
  );

  const messageOptions = await replyToMessageOptions(replies, t, attr, raterEngine);

  await message.reply(messageOptions);
};
