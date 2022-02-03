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
        position: channelDiscord?.position,
        parentId: channelDiscord?.parentId,
        permissionList: permissions?.toArray(),
        discord: channelDiscord,
      };
    }),
  );

  const parentChannels = channelList.filter((channel) => !channel.parentId).sort((a, b) => a.position - b.position);

  return parentChannels.reduce((acc, parent) => {
    const children = channelList
      .filter((channel) => channel.parentId === parent.id)
      .sort((a, b) => a.position - b.position);

    return [...acc, parent, ...children];
  }, []);
};
