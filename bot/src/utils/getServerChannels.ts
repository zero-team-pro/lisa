import { Client, Collection, Guild, NonThreadGuildBasedChannel } from 'discord.js';
import { Channel } from '../models';

export const getServerChannels = async (
  serverId: string,
  discord: Client,
  guildParam?: Guild,
  listParam?: Collection<string, NonThreadGuildBasedChannel>,
) => {
  const channelDbList = await Channel.findAll({ where: { serverId }, raw: true, order: ['id'] });

  const guild = guildParam || (await discord.guilds.fetch(serverId));
  const channelDiscordList = listParam || (await guild.channels.fetch());

  const channelList = await Promise.all(
    channelDbList.map(async (channel) => {
      const channelDiscord = channelDiscordList.find((ch) => ch.id === channel.id);
      const permissions = channelDiscord?.permissionsFor(guild.me);

      return {
        ...channel,
        name: channelDiscord?.name,
        type: channelDiscord?.type,
        position: channelDiscord?.rawPosition || null,
        permissionList: permissions?.toArray(),
        discord: channelDiscord,
      };
    }),
  );

  return channelList.sort((a, b) => a.position - b.position);
};
