import { Message } from 'discord.js';

import { AdminUser, Server, User } from '@/models';
import { DataOwner, Owner, RedisClientType, Transport } from '@/types';
import { BaseMessage, MessageType } from '@/controllers/baseMessage';
import { Translation } from '@/translation';

export class DiscordMessage extends BaseMessage<Transport.Discord> {
  private discordMessage: Message<boolean>;
  private messageType: MessageType;

  public user: User;
  public server: Server;

  constructor(discordMessage: Message<boolean>, redis: RedisClientType) {
    super(Transport.Discord, redis);
    this.discordMessage = discordMessage;
    this.messageType = this.determineMessageType();
  }

  async init() {
    this.server = await this.getServer();

    await super.init();
  }

  private determineMessageType(): MessageType {
    return MessageType.TEXT;
  }

  get raw() {
    return this.discordMessage;
  }

  async _getT() {
    return Translation(this.user.lang || this.server.lang);
  }

  get type() {
    return this.messageType;
  }

  get selfId() {
    return this.discordMessage.client.user.id;
  }

  get uniqueId() {
    // TODO
    return null;
  }

  get content() {
    return this.discordMessage.content;
  }

  get images() {
    if (!this.discordMessage.attachments) {
      return null;
    }

    return new Promise<string[]>((resolve) => resolve(this.discordMessage.attachments.map((att) => att.proxyURL)));
  }

  get photo() {
    if (!this.discordMessage.attachments) {
      return null;
    }

    return this.discordMessage.attachments;
  }

  get fromId(): string | null {
    return this.discordMessage.author?.id || null;
  }

  get chatId(): string | null {
    return this.discordMessage.channel?.id || null;
  }

  get isGroup() {
    // TODO
    return true;
  }

  get parent() {
    // TODO
    return null;
  }

  // Custom begin

  get author() {
    return this.discordMessage.author;
  }

  get channel() {
    return this.discordMessage.channel;
  }

  // Custom end

  async reply(text: string) {
    console.log('reply called with text: %j, extra: %j', text);
    await this.discordMessage.reply(text);
    // TODO
    return { isSent: true, uniqueId: null };
  }

  async replyWithMarkdown(text: string) {
    return await this.reply(text);
  }

  async startTyping() {
    // TODO
  }

  async stopTyping() {}

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

  async getServer(): Promise<Server | null> {
    try {
      const [server] = await Server.findOrCreate({
        where: { id: this.raw.guild.id },
        defaults: { id: this.raw.guild.id },
        include: 'channels',
      });
      return server;
    } catch (err) {
      return null;
    }
  }

  async getUserNameById(id: string | number): Promise<string> {
    try {
      const userId = id.toString();
      const member = await this.discordMessage.guild.members.fetch(userId);
      const userName = member.user.username;
      return userName || userId;
    } catch (err) {
      return id?.toString() || 'Ghost';
    }
  }

  async getAdmin(): Promise<AdminUser | null> {
    try {
      return await AdminUser.findOne({ where: { discordId: this.raw.author.id } });
    } catch (err) {
      return null;
    }
  }

  getContextOwner(): Owner {
    return { owner: `${this.raw.author.id}`, ownerType: DataOwner.discordUser };
  }

  getContextOwnerGroup(): Owner {
    return { owner: `${this.raw.guild.id}`, ownerType: DataOwner.discordServer };
  }

  getChatId(): string | null {
    return this.discordMessage.channel.id || null;
  }
}
