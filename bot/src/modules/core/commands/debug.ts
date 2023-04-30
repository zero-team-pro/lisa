import { CommandAttributes, TFunc } from '@/types';
import { DiscordMessage } from '@/controllers/discordMessage';

const methodName = 'debug';

const exec = async (message: DiscordMessage, t: TFunc, attr: CommandAttributes) => {
  const { server } = attr;
  await message.reply(
    `Server JSON: ${JSON.stringify(server.toJSON())}. Channels: ${typeof server.channels} ${server.channels}`,
  );
};

export const debug = { exec, methodName };
