import { Message, MessageEmbed } from 'discord.js';
import axios from 'axios';

import { Preset, Server, User } from '../models';
import { CommandAttributes, IRaterReply } from '../types';
import { Language } from '../constants';

const request = axios.create({
  baseURL: process.env.RATER_HOST || 'http://rater',
  headers: {
    'Content-Type': 'application/json',
  },
});

const convertReply = (reply: IRaterReply) => {
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
  return 'Функционал доступен, но временно не очень.';
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

export const processRaterCommand = async (command: string, message: Message, attr: CommandAttributes) => {
  const { user, server } = attr;
  const language = attr.user.raterLang;

  const messageParts = message.content.split(' ');
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
      await message.reply(convertReply(res.data));
    })
    .catch(async (err) => {
      console.log(err);
      await message.reply('Функционал временно не доступен.');
    });
};
