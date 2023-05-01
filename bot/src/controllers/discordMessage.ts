import { Message } from 'discord.js';

import { AdminUser, Server, User } from '@/models';
import { DataOwner, OwnerType, Transport } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';

export class DiscordMessage extends BaseMessage<Transport.Discord> {
  private discordMessage: Message<boolean>;
  private server: Server;

  constructor(discordMessage: Message<boolean>, server: Server) {
    super(Transport.Discord);
    this.discordMessage = discordMessage;
    this.server = server;
  }

  get raw() {
    return this.discordMessage;
  }

  get content() {
    return this.discordMessage.content;
  }

  // Custom begin

  get author() {
    return this.discordMessage.author;
  }

  get channel() {
    return this.discordMessage.channel;
  }

  // Custom end

  reply(text: string) {
    console.log('reply called with text: %j, extra: %j', text);
    return this.discordMessage.reply(text);
  }

  replyWithMarkdown(text: string) {
    return this.reply(text);
  }

  getContextOwner(): { owner: string; ownerType: OwnerType } {
    return { owner: `${this.raw.author.id}`, ownerType: DataOwner.discordUser };
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

  getChatId(): string | null {
    return this.discordMessage.channel.id || null;
  }
}
