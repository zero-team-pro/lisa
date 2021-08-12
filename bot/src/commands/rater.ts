import { Message, MessageEmbed } from 'discord.js';
import axios from 'axios';

import { IRaterReply } from '../types';

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

const getMessageData = (message: Message) => {
  return {
    content: message.content,
    authorId: message.author.id,
    guildId: message.guild.id,
    userName: message.author.username,
    guildName: message.guild.name,
    isAdmin: message.member.permissions.has('ADMINISTRATOR'),
    attachmentUrl: message.attachments.first()?.url,
  };
};

export const processRaterCommand = async (command: string, message: Message) => {
  request
    .post(`/${command}`, getMessageData(message))
    .then(async (res) => {
      await message.reply(convertReply(res.data));
    })
    .catch(async (err) => {
      console.log(err);
      await message.reply('Функционал временно не доступен.');
    });
};
