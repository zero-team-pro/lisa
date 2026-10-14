import { Attachment, Collection, Message } from 'discord.js';

import { BaseMessage, MessageType } from '@/controllers/baseMessage';
import { Bridge } from '@/controllers/bridge';
import { AdminUser, Server, DiscordUser } from '@/models';
import { Translation } from '@/translation';
import { DataOwner, Owner, RedisClientType, Transport } from '@/types';
import { textMessage, documentText } from '@/messages/document';
import type { MessageInput } from '@/messages/document';
import { normalizeMessage } from '@/messages/sources';
import { renderDiscord } from '@/messages/discord';

export class DiscordMessage extends BaseMessage<Transport.Discord, DiscordUser> {
  private discordMessage: Message<boolean>;
  private messageType: MessageType;

  public user: DiscordUser;
  public server: Server;

  constructor(discordMessage: Message<boolean>, bridge: Bridge, redis: RedisClientType) {
    super(Transport.Discord, bridge, redis);
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

  get documents() {
    if (!this.discordMessage.attachments) {
      return new Promise<null>((resolve) => resolve(null));
    }

    return new Promise<Collection<string, Attachment>>((resolve) => resolve(this.discordMessage.attachments));
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

  get mode() {
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
    return (await this.replyMessage(textMessage(text)))[0];
  }

  async replyMessage(input: MessageInput) {
    const document = await normalizeMessage(input);
    if (!documentText(document).trim()) throw new Error('Cannot send an empty message');
    const results = [];
    for (const content of renderDiscord(document)) {
      const message = await this.discordMessage.reply({ content, allowedMentions: { parse: [], repliedUser: false } });
      results.push({ isSent: true, uniqueId: this.genUniqueId(message.id, message.channelId) });
    }
    return results;
  }

  async replyWithDocument(text: string) {
    // TODO
    return await this.reply(text);
  }

  async replyWithImage(text: string) {
    // TODO
    return await this.reply(text);
  }

  async startTyping() {
    // TODO
  }

  async stopTyping() {}

  async getUser(): Promise<DiscordUser | null> {
    try {
      const [user] = await DiscordUser.findOrCreate({
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

  async getUserMentionById(id: string | number): Promise<string> {
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

  async setMode(mode: string | null) {
    // TODO
    return true;
  }
}
