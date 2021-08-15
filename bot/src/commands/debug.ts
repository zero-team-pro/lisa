import { Message } from 'discord.js';

import { CommandAttributes, TFunc } from '../types';

export const debug = async (message: Message, t: TFunc, attr: CommandAttributes) => {
  const { server } = attr;
  await message.reply(
    `Server JSON: ${JSON.stringify(server.toJSON())}. Channels: ${typeof server.channels} ${server.channels}`,
  );
};
