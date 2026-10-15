import pMap from 'p-map';
import { rememberNexusChatMessage } from '@/services/nexusChat';
import { Message, Update } from 'telegraf/types';
import { Context, Input } from 'telegraf';
import type { Convenience as tt } from 'telegraf/types';
import type * as tg from 'telegraf/types';

import { Language } from '@/constants';
import { BaseMessage, MessageType } from '@/controllers/baseMessage';
import { Bridge } from '@/controllers/bridge';
import { Logger } from '@/controllers/logger';
import { Prometheus } from '@/controllers/prometheus';
import { AdminUser, TelegramUser } from '@/models';
import { Translation } from '@/translation';
import { DataOwner, Owner, PhotoSize, RedisClientType, Transport } from '@/types';
import { textMessage, sliceDocument } from '@/messages/document';
import type { MessageInput } from '@/messages/document';
import { fromTelegram } from '@/messages/sources';
import { contextMarkdown } from '@/messages/discord';
import { sendTelegram } from '@/messages/telegram';

export interface ReplyParams {
  shouldStopTyping?: boolean;
}

export interface MediaGroup {
  /** Media group ID */
  id: string | null;
  imageList: {
    /** Telegram message ID */
    id: number;
    image: PhotoSize;
  }[];
}

export class TelegramMessage extends BaseMessage<Transport.Telegram, TelegramUser> {
  private telegramMessage: Context;
  private messageType: MessageType;

  private mediaGroup: MediaGroup = { id: null, imageList: [] };

  private typingInterval: NodeJS.Timeout;

  constructor(telegramMessage: Context, bridge: Bridge, redis: RedisClientType) {
    super(Transport.Telegram, bridge, redis);
    this.telegramMessage = telegramMessage;
    this.messageType = this.determineMessageType();
  }

  async init() {
    await super.init();
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

    if (this.message.document) {
      return MessageType.FILE;
    }

    if (this.message.text) {
      return MessageType.TEXT;
    }

    return null;
  }

  async _getT() {
    return Translation(Language.English);
  }

  public async pushImage(messageId: number, image: PhotoSize) {
    if (!this.mediaGroup.id) {
      this.mediaGroup.id = this.message.media_group_id;
    }

    this.mediaGroup.imageList.push({ id: messageId, image });
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

  getAIContent(start = 0): string {
    const document = fromTelegram(
      this.content,
      this.message?.text ? this.message.entities : this.message?.caption_entities,
    );
    return contextMarkdown(sliceDocument(document, start));
  }

  get image() {
    return this.message?.photo?.sort((a, b) => b.width + b.height - (a.width + a.height))?.[0] || null;
  }

  get images() {
    const imageList = this.mediaGroup.id
      ? this.mediaGroup.imageList.sort((a, b) => a.id - b.id).map((image) => image.image)
      : this.image
        ? [this.image]
        : [];

    if (imageList.length === 0) {
      return new Promise<[]>((resolve) => resolve([]));
    }

    return pMap(imageList, async (photo) => {
      const url = await this.telegramMessage.telegram.getFileLink(photo.file_id);
      return url.href;
    });
  }

  get photo() {
    if (!this.message?.photo) {
      return null;
    }

    return this.message.photo;
  }

  get documents() {
    if (!this.message?.document) {
      return new Promise<null>((resolve) => resolve(null));
    }

    return new Promise<any>(async (resolve, reject) => {
      const map = new Map();
      try {
        map.set('file', {
          fileId: this.message.document.file_id,
          name: this.message.document.file_name,
          url: await this.telegramMessage.telegram.getFileLink(this.message.document.file_id),
          size: this.message.document.file_size,
        });
      } catch (err) {
        Logger.warn('Cannot get file link', err, 'Telegram');
        reject(null);
      }

      return resolve(map);
    });
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

    const text = (reply as any).text ?? (reply as any).caption;
    const entities = (reply as any).text ? (reply as any).entities : (reply as any).caption_entities;
    const content = typeof text === 'string' ? contextMarkdown(fromTelegram(text, entities)) : null;

    const fromId = reply.from?.id?.toString() || null;

    const isSelf = fromId === this.selfId;

    const messageId = reply.message_id.toString();
    const chatId = reply.chat.id.toString();
    const uniqueId = this.genUniqueId(messageId, chatId);

    return { content, fromId, isSelf, uniqueId };
  }

  get mode() {
    if (this.user?.id.toString() === this.chatId) {
      return this.user?.mode || null;
    }

    return null;
  }

  // Custom begin

  get message() {
    return this.telegramMessage.message as Update.New &
      Update.NonChannel &
      Message.TextMessage &
      Message.PhotoMessage &
      Message.MediaMessage &
      Message.DocumentMessage;
  }

  // Custom end

  async reply(text: string, params?: ReplyParams, extra?: tt.ExtraReplyMessage) {
    const replies = await this.replyMessage(textMessage(text), params, extra);
    return replies[0];
  }

  async replyMessage(input: MessageInput, params?: ReplyParams, extra?: tt.ExtraReplyMessage) {
    try {
      return await sendTelegram(input, async ({ text, entities }) => {
        const result = await this.telegramMessage.reply(text, { ...extra, parse_mode: undefined, entities });
        const uniqueId = this.genUniqueId(result.message_id.toString(), result.chat.id.toString());
        if (!this.content.trimStart().startsWith('/') || /^\/(?:ai|nexus)(?:@\w+)?(?:\s|$)/i.test(this.content))
          await rememberNexusChatMessage(String(result.chat.id), result.message_id, 'assistant', text);
        Prometheus.messagesSentInc();
        return { isSent: Boolean(uniqueId), uniqueId };
      });
    } finally {
      if (params?.shouldStopTyping !== false) await this.stopTyping();
    }
  }

  async replyWithDocument(
    filename: string,
    file: string | Buffer | NodeJS.ReadableStream,
    params?: ReplyParams,
    extra?: tt.ExtraReplyMessage,
  ) {
    Logger.info('reply called with text: %j, extra: %j', { filename, params, extra }, 'Telegram');

    const { shouldStopTyping } = params || {};

    let result: Message.DocumentMessage;
    if (typeof file === 'string') {
      result = await this.telegramMessage.replyWithDocument(
        Input.fromBuffer(Buffer.from(file, 'utf-8'), filename),
        extra,
      );
    } else if (Buffer.isBuffer(file)) {
      result = await this.telegramMessage.replyWithDocument(Input.fromBuffer(file, filename), extra);
    } else {
      result = await this.telegramMessage.replyWithDocument(Input.fromReadableStream(file, filename), extra);
    }

    if (shouldStopTyping !== false) {
      await this.stopTyping();
    }

    const messageId = result.message_id.toString();
    const chatId = result.chat.id.toString();
    const uniqueId = this.genUniqueId(messageId, chatId);

    Prometheus.messagesSentInc();

    return { isSent: Boolean(uniqueId), uniqueId };
  }
  async replyWithImage(
    filename: string,
    file: string | Buffer | NodeJS.ReadableStream,
    params?: ReplyParams,
    extra?: tt.ExtraReplyMessage,
  ) {
    Logger.info('reply called with text: %j, extra: %j', { filename, params, extra }, 'Telegram');

    const { shouldStopTyping } = params || {};

    let result: Message.PhotoMessage;
    if (typeof file === 'string') {
      result = await this.telegramMessage.replyWithPhoto(Input.fromURL(file), extra);
    } else if (Buffer.isBuffer(file)) {
      result = await this.telegramMessage.replyWithPhoto(Input.fromBuffer(file, filename), extra);
    } else {
      result = await this.telegramMessage.replyWithPhoto(Input.fromReadableStream(file, filename), extra);
    }

    if (shouldStopTyping !== false) {
      await this.stopTyping();
    }

    const messageId = result.message_id.toString();
    const chatId = result.chat.id.toString();
    const uniqueId = this.genUniqueId(messageId, chatId);

    Prometheus.messagesSentInc();

    return { isSent: Boolean(uniqueId), uniqueId };
  }

  async replyWithPoll(question: string, options: string[], params?: ReplyParams, extra?: tt.ExtraPoll) {
    Logger.info('reply called with text: %j, extra: %j', { question, options, params, extra }, 'Telegram');

    const { shouldStopTyping } = params || {};

    const result = await this.telegramMessage.replyWithPoll(question, options, extra);

    if (shouldStopTyping !== false) {
      await this.stopTyping();
    }

    const messageId = result.message_id.toString();
    const chatId = result.chat.id.toString();
    const uniqueId = this.genUniqueId(messageId, chatId);

    Prometheus.messagesSentInc();

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

  async getUserMentionById(id: string | number): Promise<string> {
    try {
      const userId = typeof id === 'number' ? id : Number.parseInt(id, 10);
      const chat = (await this.telegramMessage.telegram.getChat(userId)) as tg.Chat.PrivateGetChat;
      const username = chat.username ? `@${chat.username}` : null;
      const fullName = [chat.first_name, chat.last_name].join(' ');
      return username || fullName || id.toString();
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

  async setMode(mode: string | null) {
    try {
      this.user.mode = mode;
      await this.user.save();

      return true;
    } catch (error) {
      Logger.error('setMode', error, 'Telegram Message');
      return false;
    }
  }
}
