import { Message, MessageEmbed } from 'discord.js';

import { TFunc } from '../types';

export const helpEmbed = async (message: Message, t: TFunc, text: string) => {
  const embed = new MessageEmbed().setTitle(t('help.title')).setDescription(text);

  await message.reply({ embeds: [embed] });
};
