import { Language } from '@/constants';
import { helpEmbed, isAdmin } from '@/utils';
import { Translation } from '@/translation';
import { DiscordMessage } from '@/controllers/discord/discordMessage';

const methodName = 'lang';

const exec = async (message: DiscordMessage) => {
  const { t, server, user } = message;

  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    await helpEmbed(message.raw, t, t('help.lang', { p: server.prefix }));
    return;
  }
  const params = messageParts.slice(1);

  const isUser = !params[1] || params[1] === 'rater';

  if ((params[0] === 'default' && isUser) || Object.values<string>(Language).includes(params[0])) {
    const lang = params[0] === 'default' ? null : (params[0] as Language);
    if (!params[1]) {
      user.lang = lang;
      await user.save();
    } else if (params[1] === 'server') {
      if (!isAdmin(user, message.raw)) {
        return await message.reply(t('notAdminError'));
      }
      server.lang = lang;
      await server.save();
    } else if (params[1] === 'rater') {
      user.raterLang = lang;
      await user.save();
    } else if (params[1] === 'serverRater') {
      if (!isAdmin(user, message.raw)) {
        return await message.reply(t('notAdminError'));
      }
      server.raterLang = lang;
      await server.save();
    } else {
      await message.reply(t('lang.wrongParams'));
      return;
    }

    const newT = Translation(user.lang || server.lang);
    await message.reply(newT('lang.changed'));
    return;
  }

  await message.reply(t('lang.wrongLang'));
};

export const lang = { exec, methodName };
