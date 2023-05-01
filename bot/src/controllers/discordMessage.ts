import { Message } from 'discord.js';

import { AdminUser, Context, Server, User } from '@/models';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { BotModuleId, DataOwner, Transport } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';
import { ModuleList } from '@/modules';

export class DiscordMessage implements BaseMessage {
  private discordMessage: Message<boolean>;
  private server: Server;
  private messageBuilder: MessageBuilder;
  private moduleId: BotModuleId;

  constructor(discordMessage: Message<boolean>, server: Server) {
    this.discordMessage = discordMessage;
    this.server = server;
  }

  get transport() {
    return Transport.Discord as const;
  }

  get raw() {
    return this.discordMessage;
  }

  get content() {
    return this.discordMessage.content;
  }

  get author() {
    return this.discordMessage.author;
  }

  get channel() {
    return this.discordMessage.channel;
  }

  reply(text: string) {
    console.log('reply called with text: %j, extra: %j', text);
    return this.discordMessage.reply(text);
  }

  getMessageBuilder() {
    if (!this.messageBuilder) {
      this.messageBuilder = new MessageBuilder(this);
    }

    return this.messageBuilder;
  }

  setModule(moduleId: BotModuleId) {
    this.moduleId = moduleId;
  }

  private async getContext() {
    const owner = `${this.raw.author.id}`;

    const defaultContextData = ModuleList.find((module) => module.id === this.moduleId).contextData;

    if (!defaultContextData) {
      return null;
    }

    const [context] = await Context.findOrCreate({
      where: { owner, ownerType: DataOwner.discordUser, module: this.moduleId },
      defaults: { data: defaultContextData },
    });

    // TODO: Check context data and update if needed. Later: migrations

    return context;
  }

  async getModuleData<T>() {
    const context = await this.getContext();

    if (!context) {
      return null;
    }

    return context.data as T;
  }

  async setModuleData<T>(data: T) {
    const context = await this.getContext();

    if (!context) {
      return null;
    }

    const result = await context.update({ data });

    return result.data as T;
  }

  async setModuleDataPartial<T>(data: Partial<T>) {
    const context = await this.getContext();

    if (!context) {
      return null;
    }

    const result = await context.update({ data: { ...context.data, ...data } });

    return result.data as T;
  }

  async getUser(): Promise<User | null> {
    try {
      const [user] = await User.findOrCreate({
        where: { discordId: this.raw.author.id, serverId: this.raw.guild.id },
        defaults: { discordId: this.raw.author.id, serverId: this.server.id },
      });
      return user;
    } catch (err) {
      return null;
    }
  }

  async getAdmin(): Promise<AdminUser | null> {
    try {
      return await AdminUser.findOne({ where: { discordId: this.raw.author.id } });
    } catch (err) {
      return null;
    }
  }
}
