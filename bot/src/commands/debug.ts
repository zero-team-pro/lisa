import { Message } from 'discord.js';

import { CommandAttributes } from '../types';

export const debug = async (command: string, message: Message, attr: CommandAttributes) => {
  const { server } = attr;
  await message.reply(
    `Server JSON: ${JSON.stringify(server.toJSON())}. Channels: ${typeof server.channels} ${server.channels}`,
  );
};
