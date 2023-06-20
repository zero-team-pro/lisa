import { RaterEngine } from '@/types';
import { EngineList } from '@/constants';
import { helpEmbed, isAdmin } from '@/utils';
import { DiscordMessage } from '@/controllers/discordMessage';

const methodName = 'raterEngine';

const exec = async (message: DiscordMessage) => {
  const { t, server, user } = message;

  const messageParts = message.content.split(' ');
  if (messageParts.length > 3 || (messageParts[3] && messageParts[3] !== 'server')) {
    await helpEmbed(message.raw, t, t('help.raterEngine', { p: server.prefix }));
    return;
  }
  const params = messageParts.slice(1);

  const engine = params[0];
  const isServer = params[1] === 'server';
  const isEngine = EngineList.includes(engine as any);

  if (params.length === 0) {
    return message.reply(
      t('raterEngine.current', { user: user.raterEngine || `[${t('serverDefault')}]`, server: server.raterEngine }),
    );
  }

  if (isEngine || ((isEngine || params[0] === 'default') && !isServer)) {
    const engine = params[0] as RaterEngine;

    if (isServer) {
      if (!isAdmin(user, message.raw)) {
        return await message.reply(t('notAdminError'));
      }
      server.raterEngine = engine;
      await server.save();
    } else if (!params[1]) {
      user.raterEngine = params[0] === 'default' ? null : engine;
      await user.save();
    } else {
      await helpEmbed(message.raw, t, t('help.raterEngine', { p: server.prefix }));
      return;
    }

    await message.reply(t('raterEngine.changed'));
    return;
  }

  await helpEmbed(message.raw, t, t('help.raterEngine', { p: server.prefix }));
};

export const raterEngine = { exec, methodName };
