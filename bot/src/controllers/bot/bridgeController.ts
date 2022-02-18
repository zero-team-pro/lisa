import { Client as DiscordClient, ThreadChannel } from 'discord.js';

require('dotenv').config();

import { IJsonRequest } from '../../types';
import { Bridge } from '../bridge';
import { Errors } from '../../constants';
import { AdminUser, Server, User } from '../../models';

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

  private onBridgeRequest = (message: IJsonRequest) => {
    if (message.method === 'stats') {
      return this.methodStats(message);
    } else if (message.method === 'isAdmin') {
      return this.methodIsAdmin(message);
    } else if (message.method === 'guildList') {
      return this.methodGuildList(message);
    } else if (message.method === 'guild') {
      return this.methodGuild(message);
    } else if (message.method === 'guildChannelList') {
      return this.methodGuildChannelList(message);
    } else if (message.method === 'guildChannel') {
      return this.methodGuildChannel(message);
    } else if (message.method === 'guildAdminList') {
      return this.methodGuildAdminList(message);
    } else {
      return console.warn(` [RMQ shard] Method ${message.method} not found;`);
    }
  };

  private methodStats = (message: IJsonRequest) => {
    const guildCount = this.client.guilds.cache.size;
    const res = { result: { guildCount } };
    this.bridge.response(message.from, message.id, res);
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
    const user = userDiscordId ? await guild.members.fetch(userDiscordId) : null;
    const isGuildAdmin = !!user?.permissions?.has('ADMINISTRATOR') && false;

    const dbUser = await User.findOne({ where: { discordId: userDiscordId, serverId: guildId } });
    const adminUser = await AdminUser.findOne({ where: { discordId: userDiscordId } });
    const isLocalAdmin = !!dbUser?.isAdmin || adminUser?.role === 'globalAdmin';

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
    const guildList = await Promise.all(guildIdList.map((guildId) => this.client.guilds.fetch(guildId)));
    const result = guildList.filter((guild) => guild.shardId === this.shardId).map((guild) => guild);
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

  private methodGuildAdminList = async (message: IJsonRequest) => {
    // TODO: Types
    const guildId: string = message.params.guildId;

    const guild = await this.client.guilds.cache.get(guildId);
    if (guild?.shardId !== this.shardId) {
      return this.bridge.response(message.from, message.id, { result: null });
    }

    const serverWithAdmins = await Server.findOne({
      where: { id: guildId },
      include: [{ model: AdminUser, as: 'adminUserList', through: { attributes: [] } }],
    });
    // TODO: Use fetch with array
    const adminUserList = await Promise.all(
      serverWithAdmins?.adminUserList?.map(async (admin) => {
        try {
          const member = await guild.members.fetch(admin.discordId);
          return {
            id: admin.id,
            discordId: admin.discordId,
            role: admin.role,
            name: member?.displayName,
            iconUrl: member?.displayAvatarURL(),
          };
        } catch (err) {
          return admin;
        }
      }),
    );

    const result = { adminUserList: adminUserList };
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
      permissionList: channel.permissionsFor(guild.me).toArray(),
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
      position: channel instanceof ThreadChannel || channel.type === 'DM' ? null : channel?.position,
      permissionList: channel.type === 'DM' ? null : channel.permissionsFor(guild.me).toArray(),
    };
    this.bridge.response(message.from, message.id, { result: result });
  };
}
