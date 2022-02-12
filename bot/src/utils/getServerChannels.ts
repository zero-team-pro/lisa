import { Collection, NonThreadGuildBasedChannel } from 'discord.js';

import { Channel } from '../models';
import { Bridge } from '../controllers/bridge';

export const getServerChannels = async (
  serverId: string,
  bridge: Bridge,
  listParam?: Collection<string, NonThreadGuildBasedChannel>,
) => {
  const channelDbList = await Channel.findAll({ where: { serverId }, raw: true, order: ['id'] });

  let channelDiscordList = listParam;
  if (!channelDiscordList) {
    const discordChannelListParts = await bridge.requestGlobal({ method: 'guildChannelList', params: serverId });
    channelDiscordList = discordChannelListParts.map((part) => part.result).filter((channel) => channel)[0];
  }

  const channelList = await Promise.all(
    channelDbList.map(async (channel) => {
      const channelDiscord = channelDiscordList.find((ch) => ch.id === channel.id);

      return {
        ...channel,
        name: channelDiscord?.name,
        type: channelDiscord?.type,
        position: channelDiscord?.position,
        parentId: channelDiscord?.parentId,
        // TODO: Types
        permissionList: (channelDiscord as any)?.permissionList,
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
