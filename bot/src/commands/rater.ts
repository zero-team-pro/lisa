import { Message, MessageEmbed } from 'discord.js';
import axios from 'axios';

import { Preset, Server, User } from '../models';
import { CommandAttributes, IRaterReply, TFunc } from '../types';
import { Language } from '../constants';

const request = axios.create({
  baseURL: process.env.RATER_HOST || 'http://rater',
  headers: {
    'Content-Type': 'application/json',
  },
});

const convertReply = (reply: IRaterReply, t: TFunc) => {
  if (reply.type === 'embed') {
    const embed = new MessageEmbed();

    reply.title && embed.setTitle(reply.title);
    reply.description && embed.setDescription(reply.description);
    reply.color && embed.setColor(reply.color);
    reply.fields && reply.fields.forEach((field) => embed.addField(field.name, field.value, field.inline));

    return { embeds: [embed] };
  }
  if (reply.type === 'text') {
    return reply.text;
  }
  return t('external.processingError');
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

const getMessageData = (message: Message, language: Language, preset: Preset | null) => {
  let content = message.content;

  if (preset) {
    const messageParts = content.split(' ');
    messageParts[1] = preset.weights;
    content = messageParts.join(' ');

    console.log(`Preset: ${preset.name} (${preset.weights})`);
  }

  return {
    content,
    authorId: message.author.id,
    guildId: message.guild.id,
    userName: message.author.username,
    guildName: message.guild.name,
    isAdmin: message.member.permissions.has('ADMINISTRATOR'),
    attachmentUrl: message.attachments.first()?.url || null,
    lang: language,
  };
};

export const processRaterCommand = async (message: Message, t: TFunc, attr: CommandAttributes) => {
  const messageParts = message.content.split(' ');
  const command = messageParts[0].substring(1);
  const { user, server } = attr;
  const language = attr.user.raterLang;

  let preset = null;
  if (command === 'rate') {
    const presetName = messageParts[1];

    if (presetName) {
      preset = await findPreset(presetName, user, server);
    }
  }

  const sendingData = getMessageData(message, language, preset);

  request
    .post(`/${command}`, sendingData)
    .then(async (res) => {
      await message.reply(convertReply(res.data, t));
    })
    .catch(async (err) => {
      console.log(err);
      await message.reply(t('external.notAvailable'));
    });
};
