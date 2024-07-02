import { Context } from 'telegraf';
import { Message, Update } from '@telegraf/types';
import * as tt from 'telegraf/typings/telegram-types';
import pMap from 'p-map';

import { AdminUser, TelegramUser } from '@/models';
import { DataOwner, Owner, RedisClientType, Transport } from '@/types';
import { BaseMessage, MessageType } from '@/controllers/baseMessage';
import { Translation } from '@/translation';
import { Language } from '@/constants';
import { splitString } from '@/utils';

export interface ReplyParams {
  shouldStopTyping?: boolean;
}

export class TelegramMessage extends BaseMessage<Transport.Telegram> {
  private telegramMessage: Context;
  private messageType: MessageType;

  private typingInterval: NodeJS.Timeout;

  private MESSAGE_MAX_LENGTH = 4500;

  constructor(telegramMessage: Context, redis: RedisClientType) {
    super(Transport.Telegram, redis);
    this.telegramMessage = telegramMessage;
    this.messageType = this.determineMessageType();
  }

  async init() {
    super.init();
  }

  private determineMessageType(): MessageType {
    if (!this.message) {
      return null;
    }

    if (this.message.reply_to_message) {
      return MessageType.REPLY;
    }

    if (this.message.forward_origin) {
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

  async _getT() {
    return Translation(Language.English);
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

  get uniqueId() {
    const messageId = this.telegramMessage.message?.message_id.toString();
    const chatId = this.chatId;

    return this.genUniqueId(messageId, chatId);
  }

  get content() {
    if (typeof this.message?.text !== 'string' && typeof this.message?.caption !== 'string') {
      return '';
    }

    return this.message.text || this.message.caption;
  }

  // TODO: Telegram send all images with separate update (media_group_id)
  get images() {
    // return pMap(this.message?.photo, async (photo) => {
    //   const url = await this.telegramMessage.telegram.getFileLink(photo.file_id);
    //   return url.href;
    // });
    const photo = this.message?.photo?.sort((a, b) => b.width + b.height - (a.width + a.height))?.[0];

    if (!photo) {
      return new Promise<[]>((resolve) => resolve([]));
    }

    return this.telegramMessage.telegram.getFileLink(photo.file_id).then((url) => [url.href]);
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

    const messageId = reply.message_id.toString();
    const chatId = reply.chat.id.toString();
    const uniqueId = this.genUniqueId(messageId, chatId);

    return { content, fromId, isSelf, uniqueId };
  }

  // Custom begin

  get message() {
    return this.telegramMessage.message as Update.New & Update.NonChannel & Message.TextMessage & Message.PhotoMessage;
  }

  // Custom end

  async reply(text: string, params?: ReplyParams, extra?: tt.ExtraReplyMessage) {
    console.log('reply called with text: %j, extra: %j', text, params, extra);

    const { shouldStopTyping } = params || {};

    if (shouldStopTyping !== false) {
      await this.stopTyping();
    }
    const result = await this.telegramMessage.reply(text, extra);

    const messageId = result.message_id.toString();
    const chatId = result.chat.id.toString();
    const uniqueId = this.genUniqueId(messageId, chatId);

    return { isSent: Boolean(uniqueId), uniqueId };
  }

  async replyLong(text: string, extra?: tt.ExtraReplyMessage) {
    const parts = splitString(text, this.MESSAGE_MAX_LENGTH);

    const replies = await pMap(parts, (part) => this.reply(part, { shouldStopTyping: false }, extra), {
      concurrency: 1,
    });
    await this.stopTyping();

    return replies;
  }

  async replyWithMarkdown(text: string, extra?: tt.ExtraReplyMessage) {
    console.log('reply called with text: %j, extra: %j', text, extra);

    const result = await this.telegramMessage.replyWithMarkdownV2(text, extra);

    const messageId = result.message_id.toString();
    const chatId = result.chat.id.toString();
    const uniqueId = this.genUniqueId(messageId, chatId);

    return { isSent: Boolean(uniqueId), uniqueId };
  }

  async startTyping() {
    await this.stopTyping();

    const maxTypingDuraction = 5 * 60 * 1_000; // 5 minutes
    const repeatInterval = 3_000; // 3 seconds
    let iteration = 0;

    this.typingInterval = setInterval(async () => {
      if (iteration * repeatInterval >= maxTypingDuraction) {
        return clearInterval(this.typingInterval);
      }
      iteration++;

      await this.telegramMessage.sendChatAction('typing');
    }, repeatInterval);
  }

  async stopTyping() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
    }
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

  getContextOwner(): Owner {
    return { owner: `${this.message.from.id}`, ownerType: DataOwner.telegramUser };
  }

  getContextOwnerGroup(): Owner {
    return { owner: `${this.message.chat.id}`, ownerType: DataOwner.telegramChat };
  }
}
