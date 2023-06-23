import { EmbedBuilder } from 'discord.js';

import { translationEnglish } from '@/localization';
import { DiscordMessage } from '@/controllers/discord/discordMessage';

const methodName = 'help';

const exec = async (message: DiscordMessage) => {
  const { t, server } = message;
  const messageParts = message.content.split(' ');
  const params = messageParts.slice(1);
  const helpSection = params[0];
  const helpSectionBlackList = ['title', 'sectionList', 'notFound', 'general'];
  const helpSectionList = Object.keys(translationEnglish.help).filter(
    (section) => !helpSectionBlackList.includes(section),
  );
  type HelpSectionType = keyof typeof translationEnglish.help;

  const embed = new EmbedBuilder().setTitle(t('help.title'));
  if (messageParts.length === 1) {
    embed
      .setDescription(t('help.general', { p: server?.prefix }))
      .addFields({ name: t('help.sectionList'), value: helpSectionList.map((section) => `\`${section}\``).join(', ') });
  } else if (helpSectionList.includes(helpSection)) {
    embed.setDescription(
      t(`help.${helpSection as HelpSectionType}`, {
        p: server?.prefix,
        helpBlock: {
          stats: t('helpBlock.stats'),
        },
      }),
    );
  } else {
    embed.setDescription(t('help.notFound'));
  }

  await message.raw.reply({ embeds: [embed] });
};

export const help = { exec, methodName };
