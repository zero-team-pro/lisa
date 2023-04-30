import { Message } from 'discord.js';

import { AdminUser, Server, User } from '@/models';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { Transport } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';

export class DiscordMessage implements BaseMessage {
  private discordMessage: Message<boolean>;
  private server: Server;
  private messageBuilder: MessageBuilder;

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

  async getUser(): Promise<User | null> {
    try {
      const [user] = await User.findOrCreate({
        where: { discordId: this.discordMessage.author.id, serverId: this.discordMessage.guild.id },
        defaults: { discordId: this.discordMessage.author.id, serverId: this.server.id },
      });
      return user;
    } catch (err) {
      return null;
    }
  }

  async getAdmin(): Promise<AdminUser | null> {
    try {
      return await AdminUser.findOne({ where: { discordId: this.discordMessage.author.id } });
    } catch (err) {
      return null;
    }
  }
}
