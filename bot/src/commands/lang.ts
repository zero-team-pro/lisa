import { Message } from 'discord.js';

import { TFunc, CommandAttributes } from '../types';
import { Language } from '../constants';

export const lang = async (message: Message, t: TFunc, attr: CommandAttributes) => {
  const { server, user } = attr;

  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    await message.reply(t('help.lang'));
    return;
  }
  const params = messageParts.slice(1);

  if (Object.values<string>(Language).includes(params[0])) {
    const lang = params[0] as Language;
    if (!params[1]) {
      user.lang = lang;
      await user.save();
    } else if (params[1] === 'server') {
      server.lang = lang;
      await server.save();
    } else if (params[1] === 'rater') {
      user.raterLang = lang;
      await user.save();
    } else if (params[1] === 'serverRater') {
      server.raterLang = lang;
      await server.save();
    } else {
      await message.reply(`Wrong params or lang`);
      return;
    }

    await message.reply(`Language changed`);
    return;
  }

  await message.reply(`Wrong lang`);
};
