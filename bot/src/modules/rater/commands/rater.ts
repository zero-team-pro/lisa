import { AttachmentBuilder, ColorResolvable, EmbedBuilder, Message, MessageReplyOptions } from 'discord.js';
import axios from 'axios';

import { Preset, RaterCall, Server, DiscordUser } from '@/models';
import { RaterEngine, RaterApiReply, RaterStat, TFunc, RaterReply } from '@/types';
import { Language } from '@/constants';
import { translationEnglish } from '@/localization';
import { getRaterLimitToday } from '@/utils';
import { DiscordMessage } from '@/controllers/discord/discordMessage';

const methodName = 'rater';

const request = axios.create({
  baseURL: process.env.RATER_HOST || 'http://rater',
  headers: {
    'Content-Type': 'application/json',
  },
});

const findPreset = async (presetName: string, user: DiscordUser, server: Server) => {
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
  message: DiscordMessage,
  raterEngine: RaterEngine,
): Promise<RaterReply> => {
  console.log('Rater reply: ', JSON.stringify(reply));

  if (reply.status === 'ok') {
    await RaterCall.create({ userId: message.user.id, rater: raterEngine });

    const stats = reply.stats.map((stat) => {
      return statKeyToLang(stat, message.t);
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
    const file = new AttachmentBuilder(buff, { name: 'raterDebug.png' });
    const embed = new EmbedBuilder()
      .setTitle('Image')
      .setImage('attachment://raterDebug.png')
      .setDescription(reply.text);

    return { type: 'debug', embed: embed, file: file };
  }

  return { type: 'error', error: message.t('external.processingError') };
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

  if (repliesColors.filter((color) => color === 'Orange').length > 0) {
    return 'Orange';
  }
  if (repliesColors.filter((color) => color === 'Purple').length > 0) {
    return 'Purple';
  }
  if (repliesColors.filter((color) => color === 'Blue').length > 0) {
    return 'Blue';
  }
  return null;
};

const replyToMessageOptions = async (
  replies: RaterReply[],
  message: DiscordMessage,
  raterEngine: string,
  limitTodayPrev: number,
): Promise<MessageReplyOptions> => {
  const { t, user } = message;

  const debugReplies = replies.map((reply) => (reply.type === 'debug' ? reply : null)).filter((reply) => !!reply);
  if (debugReplies[0]) {
    return { embeds: [debugReplies[0].embed], files: [debugReplies[0].file] };
  }

  const embed = new EmbedBuilder();

  embed.setTitle(repliesGetTitle(replies, t, raterEngine));

  const color = repliesGetColor(replies);
  color && embed.setColor(color);

  // Data
  replies.map((reply) => {
    if (reply.type === 'data') {
      embed.addFields({ name: reply.engine, value: t('rater.level', { level: reply.level }) });

      embed.addFields({
        name: statKeyToLang(reply.mainStat, t),
        value: reply.stats.join('\n') || 'null',
        inline: true,
      });

      embed.addFields({
        name: t('rater.score', { score: reply.score }),
        value: `${t('rater.mainScore', { score: reply.mainScore })} ${t('rater.subScore', { score: reply.subScore })}`,
        inline: true,
      });
    }
  });

  // Errors
  replies.map((reply) => {
    if (reply.type === 'error') {
      embed.addFields({ name: t('error'), value: reply.error });
    }
  });

  // Limits
  const limitToday = await getRaterLimitToday(user.id);
  const limitDiff = limitToday - limitTodayPrev;
  embed.addFields({ name: t('rater.callsToday'), value: `${limitToday}/${user.raterLimit} (+${limitDiff})` });

  return { embeds: [embed] };
};

const exec = async (message: DiscordMessage) => {
  const { t, user, server } = message;
  const messageParts = message.content.split(' ');
  const raterLang = user.raterLang || server.raterLang;
  const raterEngine = user.raterEngine || server.raterEngine;

  const limitToday = await getRaterLimitToday(user.id);
  if (limitToday >= user.raterLimit) {
    return await message.reply(t('rater.limitReached'));
  }

  let preset = null;
  const presetName = messageParts[1];
  if (presetName) {
    preset = await findPreset(presetName, user, server);
  }

  const replies = await Promise.all(
    raterEngine.split('+').map(async (engine: RaterEngine): Promise<RaterReply> => {
      const sendingData = getMessageData(message.raw, raterLang, preset, engine);
      console.log('Rater sending: ', JSON.stringify(sendingData));

      return await request
        .post('/rate', sendingData)
        .then(async (res) => {
          return await convertReply(res.data, message, engine);
        })
        .catch(async (err) => {
          console.log(err);
          return { type: 'error', error: t('external.notAvailable') };
        });
    }),
  );

  const messageOptions = await replyToMessageOptions(replies, message, raterEngine, limitToday);

  await message.raw.reply(messageOptions);
};

export const rater = { exec, methodName };
