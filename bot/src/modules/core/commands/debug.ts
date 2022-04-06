import { Message } from 'discord.js';

import { CommandAttributes, TFunc } from '../../../types';

const methodName = 'debug';

const exec = async (message: Message, t: TFunc, attr: CommandAttributes) => {
  const { server } = attr;
  await message.reply(
    `Server JSON: ${JSON.stringify(server.toJSON())}. Channels: ${typeof server.channels} ${server.channels}`,
  );
};

export const debug = { exec, methodName };
