import { Message, MessageEmbed } from 'discord.js';

import { TFunc } from '../types';
import { translationEnglish } from '../localization';

export const help = async (message: Message, t: TFunc) => {
  const messageParts = message.content.split(' ');
  const params = messageParts.slice(1);
  const helpSection = params[0];
  const helpSectionList = Object.keys(translationEnglish.help);
  type HelpSectionType = keyof typeof translationEnglish.help;
  const embed = new MessageEmbed().setTitle(t('help.title'));

  if (messageParts.length === 1) {
    embed
      .setDescription(t('help.general'))
      .addField(t('help.sectionList'), helpSectionList.map((section) => `\`${section}\``).join(', '));
  } else if (helpSectionList.includes(helpSection)) {
    embed.setDescription(t(`help.${helpSection as HelpSectionType}`));
  } else {
    embed.setDescription(t('help.notFound'));
  }

  await message.reply({ embeds: [embed] });
};
