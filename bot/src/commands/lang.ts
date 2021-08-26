import { Message } from 'discord.js';

import { TFunc, CommandAttributes } from '../types';
import { Language } from '../constants';
import { helpEmbed, isAdmin } from '../helpers';
import Translation from '../translation';

export const lang = async (message: Message, t: TFunc, attr: CommandAttributes) => {
  const { server, user } = attr;

  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    await helpEmbed(message, t, t('help.lang', { p: server.prefix }));
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
      if (!isAdmin(user, message)) {
        return await message.reply(t('notAdminError'));
      }
      server.lang = lang;
      await server.save();
    } else if (params[1] === 'rater') {
      user.raterLang = lang;
      await user.save();
    } else if (params[1] === 'serverRater') {
      if (!isAdmin(user, message)) {
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
