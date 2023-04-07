import { ChannelType, Client as DiscordClient, PermissionsBitField, ThreadChannel } from 'discord.js';

require('dotenv').config();

import { IJsonRequest } from '../../types';
import { Bridge } from '../bridge';
import { Errors } from '../../constants';
import { AdminUser, AdminUserServer } from '../../models';

// TODO: Catch on fetch from Discord
export class BridgeController {
  private client: DiscordClient;
  private bridge: Bridge;
  private readonly shardId: number;

  constructor(bridge: Bridge, client: DiscordClient, shardId: number) {
    this.bridge = bridge;
    this.client = client;

    this.shardId = shardId;
  }

  public async init() {
    this.bridge.request('gateway', { method: 'alive' });
    this.bridge.bindGlobalQueue();
    this.bridge.receiveMessages(this.onBridgeRequest);
  }

  private onBridgeRequest = async (message: IJsonRequest) => {
    try {
      if (message.method === 'stats') {
        return await this.methodStats(message);
      } else if (message.method === 'isAdmin') {
        return await this.methodIsAdmin(message);
      } else if (message.method === 'guildList') {
        return await this.methodGuildList(message);
      } else if (message.method === 'guild') {
        return await this.methodGuild(message);
      } else if (message.method === 'guildChannelList') {
        return await this.methodGuildChannelList(message);
      } else if (message.method === 'guildChannel') {
        return await this.methodGuildChannel(message);
      } else if (message.method === 'guildFetchUsers') {
        return await this.methodGuildFetchUsers(message);
      } else {
        return console.warn(` [RMQ shard] Method ${message.method} not found;`);
      }
    } catch (err) {
      console.log(err);
      return this.bridge.response(message.from, message.id, { result: null, error: Errors.UNKNOWN });
    }
  };

  private methodStats = (message: IJsonRequest) => {
    const guildCount = this.client.guilds.cache.size;
    const res = { result: { guildCount } };
    return this.bridge.response(message.from, message.id, res);
  };

  private methodIsAdmin = async (message: IJsonRequest, isInternal: boolean = false) => {
    // TODO: Types
    const guildId: string = message.params.guildId;
    const userDiscordId: string | null = message.params.userDiscordId;

    const guild = await this.client.guilds.cache.get(guildId);
    if (guild?.shardId !== this.shardId) {
      if (isInternal) {
        return null;
      } else {
        return this.bridge.response(message.from, message.id, { result: null });
      }
    }

    // TODO: Use only DB. Set DB isAdmin on this check? Cache instead? Rescan check all admins?
    const user = userDiscordId ? await guild.members.fetch(userDiscordId).catch(() => null) : null;
    const isGuildAdmin = !!user?.permissions?.has(PermissionsBitField.Flags.Administrator);

    const adminUser = await AdminUser.findOne({
      where: { discordId: userDiscordId },
    });
    const adminToServer = await AdminUserServer.findOne({
      where: { serverId: guild.id, adminUserId: adminUser.id },
    });
    const isLocalAdmin = !!adminToServer || adminUser?.role === 'globalAdmin';

    const isAdmin = isGuildAdmin || isLocalAdmin;

    if (isInternal) {
      return isAdmin;
    }

    const result = { isAdmin };
    const error = isAdmin ? undefined : Errors.FORBIDDEN;
    this.bridge.response(message.from, message.id, { result: result, error });
  };

  private methodGuildList = async (message: IJsonRequest) => {
    // TODO: Types
    const guildIdList: string[] = message.params.reqList;
    // const userDiscordId: string | null = message.params.userDiscordId;

    // TODO: Replace with cache or use RR or save to DB with cron
    const guildList = await Promise.all(
      guildIdList.map(async (guildId) => {
        return await this.client.guilds
          .fetch(guildId)
          .catch(() => ({ id: guildId, shardId: this.shardId, error: Errors.FORBIDDEN }));
      }),
    );
    const result = guildList.filter((guild) => guild.shardId === this.shardId);
    this.bridge.response(message.from, message.id, { result });
  };

  private methodGuild = async (message: IJsonRequest) => {
    // TODO: Types
    const guildId: string = message.params.guildId;

    const guild = await this.client.guilds.cache.get(guildId);

    const isAdmin = await this.methodIsAdmin(message, true);
    if (isAdmin === null) {
      return this.bridge.response(message.from, message.id, { result: null, error: Errors.FORBIDDEN });
    }

    const result = { guild: guild, isAdmin };
    const error = isAdmin ? undefined : Errors.FORBIDDEN;
    this.bridge.response(message.from, message.id, { result: result, error });
  };

  private methodGuildFetchUsers = async (message: IJsonRequest) => {
    // TODO: Types
    const guildId: string = message.params.guildId;
    const discordIdList: string[] = message.params.discordIdList;

    const guild = await this.client.guilds.cache.get(guildId);
    if (guild?.shardId !== this.shardId) {
      return this.bridge.response(message.from, message.id, { result: null });
    }

    const adminUserList = {};

    await Promise.all(
      discordIdList?.map(async (discordId) => {
        try {
          const member = await guild.members.fetch(discordId);
          adminUserList[discordId] = {
            name: member?.displayName,
            iconUrl: member?.displayAvatarURL(),
            isGuildAdmin: !!member?.permissions?.has(PermissionsBitField.Flags.Administrator),
          };
        } catch (err) {
          adminUserList[discordId] = {};
        }
      }),
    );

    const result = { adminUserList };
    this.bridge.response(message.from, message.id, { result: result });
  };

  private methodGuildChannelList = async (message: IJsonRequest) => {
    // TODO: Types
    const guildId: string = message.params.guildId;
    const isAdminCheck: boolean | null = message.params.isAdminCheck;

    const guild = await this.client.guilds.cache.get(guildId);

    if (guild?.shardId !== this.shardId) {
      return this.bridge.response(message.from, message.id, { result: null });
    }

    if (isAdminCheck) {
      const isAdmin = await this.methodIsAdmin(message, true);
      if (isAdmin === null) {
        return this.bridge.response(message.from, message.id, { result: null, error: Errors.FORBIDDEN });
      }
    }

    const channelList = await guild.channels.fetch();
    const result = channelList.map((channel) => ({
      ...channel,
      position: channel.position,
      permissionList: channel.permissionsFor(guild.members.me).toArray(),
    }));
    this.bridge.response(message.from, message.id, { result: result });
  };

  private methodGuildChannel = async (message: IJsonRequest) => {
    // TODO: Types
    const guildId: string = message.params.guildId;
    const channelId: string = message.params.channelId;
    const isAdminCheck: boolean | null = message.params.isAdminCheck;

    const guild = await this.client.guilds.cache.get(guildId);
    if (guild?.shardId !== this.shardId) {
      return this.bridge.response(message.from, message.id, { result: null });
    }

    if (isAdminCheck) {
      const isAdmin = await this.methodIsAdmin(message, true);
      if (isAdmin === null) {
        return this.bridge.response(message.from, message.id, { result: null, error: Errors.FORBIDDEN });
      }
    }

    // TODO: GET -> fetch, POST scan -> (cache, permissions count)
    const channel = await this.client.channels.fetch(channelId);
    const result = {
      ...channel,
      position:
        channel instanceof ThreadChannel || channel.type === ChannelType.DM || channel.type === ChannelType.GroupDM
          ? null
          : channel?.position,
      permissionList:
        channel.type === ChannelType.DM || channel.type === ChannelType.GroupDM
          ? null
          : channel.permissionsFor(guild.members.me).toArray(),
    };
    this.bridge.response(message.from, message.id, { result: result });
  };
}
