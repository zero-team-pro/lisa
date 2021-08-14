import { Message } from 'discord.js';

import { Server } from '../models';

export const debug = async (command: string, message: Message) => {
  const server = await Server.findByPk(message.guild.id, { include: 'channels' });
  // const channels = await server.getChannels();
  await message.reply(
    `Server JSON: ${JSON.stringify(server.toJSON())}. Channels: ${typeof server.channels} ${server.channels}`,
  );
};
