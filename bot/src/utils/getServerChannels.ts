import { Collection, NonThreadGuildBasedChannel } from 'discord.js';

import { Channel } from '../models';
import { Bridge } from '../controllers/bridge';
import { Errors } from '../constants';

export const getServerChannels = async (
  guildId: string,
  bridge: Bridge,
  listParam?: Collection<string, NonThreadGuildBasedChannel>,
) => {
  const channelDbList = await Channel.findAll({ where: { serverId: guildId }, raw: true, order: ['id'] });

  let channelDiscordList = listParam;
  let channelDiscordError;
  if (!channelDiscordList) {
    const discordChannelListParts = await bridge.requestGlobal({
      method: 'guildChannelList',
      params: { guildId, isAdminCheck: false },
    });
    channelDiscordList = discordChannelListParts.map((part) => part.result).filter((channel) => channel)[0];
    channelDiscordError = discordChannelListParts.map((part) => part.error).filter((channel) => channel)[0];
  }

  // Probably bot not connected to guild anymore
  if (!channelDiscordList && !channelDiscordError) {
    throw Errors.FORBIDDEN_API;
  }
  if (channelDiscordError || !channelDiscordList) {
    throw Errors.UNKNOWN;
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
