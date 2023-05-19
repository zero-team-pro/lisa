import { Context } from 'telegraf';
import { Message, Update } from 'typegram';
import * as tt from 'telegraf/typings/telegram-types';

import { AdminUser, TelegramUser } from '@/models';
import { DataOwner, OwnerType, Transport } from '@/types';
import { BaseMessage, MessageType } from '@/controllers/baseMessage';

export class TelegramMessage extends BaseMessage<Transport.Telegram> {
  private telegramMessage: Context;
  private messageType: MessageType;

  constructor(telegramMessage: Context) {
    super(Transport.Telegram);
    this.telegramMessage = telegramMessage;
    this.messageType = this.determineMessageType();
  }

  private determineMessageType(): MessageType {
    if (!this.message) {
      return null;
    }

    if (this.message.reply_to_message) {
      return MessageType.REPLY;
    }

    if (this.message.forward_date || this.message.forward_signature) {
      return MessageType.REPOST;
    }

    if (this.message.photo) {
      return MessageType.PHOTO;
    }

    if (this.message.text) {
      return MessageType.TEXT;
    }

    return null;
  }

  get raw() {
    return this.telegramMessage;
  }

  get type() {
    return this.messageType;
  }

  get selfId() {
    return this.telegramMessage.botInfo.id.toString();
  }

  get content() {
    if (typeof this.message?.text !== 'string' && typeof this.message?.caption !== 'string') {
      return '';
    }

    return this.message.text || this.message.caption;
  }

  get photo() {
    if (!this.message?.photo) {
      return null;
    }

    return this.message.photo;
  }

  get fromId(): string | null {
    return this.message.from?.id?.toString() || null;
  }

  get chatId(): string | null {
    return this.telegramMessage.chat.id.toString() || null;
  }

  get isGroup() {
    return this.telegramMessage.chat.type === 'group' || this.telegramMessage.chat.type === 'supergroup';
  }

  get parent() {
    const reply = this.message.reply_to_message;

    if (!reply) {
      return null;
    }

    const text = (reply as any).text;
    const content = typeof text === 'string' ? text || '' : null;

    const fromId = reply.from.id.toString();

    const isSelf = fromId === this.selfId;

    return { content, fromId, isSelf };
  }

  // Custom begin

  get message() {
    return this.telegramMessage.message as Update.New & Update.NonChannel & Message.TextMessage & Message.PhotoMessage;
  }

  // Custom end

  reply(text: string, extra?: tt.ExtraReplyMessage) {
    console.log('reply called with text: %j, extra: %j', text, extra);
    return this.telegramMessage.reply(text, extra);
  }

  replyWithMarkdown(text: string, extra?: tt.ExtraReplyMessage) {
    console.log('reply called with text: %j, extra: %j', text, extra);
    return this.telegramMessage.replyWithMarkdownV2(text, extra);
  }

  getContextOwner(): { owner: string; ownerType: OwnerType } {
    return { owner: `${this.message.from.id}`, ownerType: DataOwner.telegramUser };
  }

  async getUser(): Promise<TelegramUser | null> {
    try {
      return await TelegramUser.findByPk(this.message.from?.id);
    } catch (err) {
      return null;
    }
  }

  async getUserNameById(id: string | number): Promise<string> {
    try {
      const chatId = Number.parseInt(this.chatId, 10);
      const userId = typeof id === 'number' ? id : Number.parseInt(id, 10);
      const member = await this.telegramMessage.telegram.getChatMember(chatId, userId);
      const userName = [member.user.first_name, member.user.last_name].join(' ');
      return userName || id.toString();
    } catch (err) {
      return id?.toString() || 'Ghost';
    }
  }

  async getAdmin(): Promise<AdminUser | null> {
    try {
      const telegramUser = await TelegramUser.findByPk(this.message?.from?.id, { include: [AdminUser] });
      return telegramUser.admin;
    } catch (err) {
      return null;
    }
  }
}
