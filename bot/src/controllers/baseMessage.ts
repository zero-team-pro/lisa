import { Message } from 'discord.js';
import * as Mdast from 'mdast';
import { Context as TelegramContext } from 'telegraf';

import { BotError } from '@/controllers/botError';
import { Bridge } from '@/controllers/bridge';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { MessageBuilderMdast } from '@/controllers/messageBuilderMdast';
import { AdminUser, Context, TelegramUser, User } from '@/models';
import { ModuleList } from '@/modules';
import { BotModuleId, ContextData, Owner, RedisClientType, TFunc, Transport } from '@/types';

type RawType<T> = T extends Transport.Discord
  ? Message<boolean>
  : T extends Transport.Telegram
  ? TelegramContext
  : unknown;

// TODO
export enum MessageType {
  TEXT = 'text',
  REPLY = 'reply',
  REPOST = 'repost',
  PHOTO = 'photo',
  FILE = 'file',
}

export interface ReplyResult {
  isSent: boolean;
  uniqueId: string | null;
}

export interface Parent {
  content: string;
  fromId: string;
  isSelf: boolean;
  uniqueId: string;
}

/*
 * Check example:

  if (message.transport === Transport.Telegram) {
    const telegramMessage = (message as BaseMessage<Transport.Telegram>).raw;
  }
*/

export abstract class BaseMessage<T extends Transport | unknown = unknown> {
  private transportType: Transport;
  private messageBuilder: MessageBuilder;
  private messageBuilderMdast: MessageBuilderMdast;
  private isMessageProcessed: boolean = false;
  private isMessageInterrupted: boolean = false;
  private redisClient: RedisClientType;
  private _t: TFunc;

  public bridge: Bridge;
  public user: TelegramUser | User | null;

  constructor(transport: Transport, bridge: Bridge, redis: RedisClientType) {
    this.transportType = transport;
    this.bridge = bridge;
    this.redisClient = redis;
  }

  async init(): Promise<any> {
    this.user = await this.getUser();
    this._t = await this._getT();
  }

  get transport(): Transport {
    return this.transportType;
  }

  get redis(): RedisClientType {
    return this.redisClient;
  }

  abstract get raw(): RawType<T>;
  abstract _getT(): Promise<TFunc>;

  abstract get type(): MessageType;
  abstract get selfId(): string;
  abstract get uniqueId(): string | null;
  abstract get content(): string;
  abstract get images(): Promise<string[]>;
  abstract get photo(): any;
  abstract get documents(): Promise<Map<string, any> | null>;
  abstract get fromId(): string;
  abstract get chatId(): string | null;
  abstract get isGroup(): boolean;
  abstract get parent(): Parent | null;

  abstract reply(text: string): Promise<ReplyResult>;
  abstract replyLong(text: string | Mdast.Root, isMarkdown?: boolean): Promise<ReplyResult[]>;
  abstract replyWithMarkdown(text: string): Promise<ReplyResult>;
  abstract replyWithDocument(filename: string, file: string | Buffer | NodeJS.ReadableStream): Promise<ReplyResult>;
  abstract startTyping(): Promise<void>;
  abstract stopTyping(): Promise<void>;

  abstract getUser(): Promise<TelegramUser | User | null>;
  abstract getUserNameById(id: string | number): Promise<string>;
  abstract getUserMentionById(id: string | number): Promise<string>;
  abstract getAdmin(): Promise<AdminUser | null>;

  abstract getContextOwner(): Owner;
  abstract getContextOwnerGroup(): Owner;

  get t(): TFunc {
    return this._t;
  }

  get isProcessed() {
    return this.isMessageProcessed;
  }

  get isInterrupted() {
    return this.isMessageInterrupted;
  }

  markProcessed() {
    this.isMessageProcessed = true;
  }

  markInterrupted() {
    this.isMessageInterrupted = true;
  }

  getMessageBuilder() {
    if (!this.messageBuilderMdast) {
      this.messageBuilderMdast = new MessageBuilderMdast(this);
    }

    return this.messageBuilderMdast;
  }

  /** @deprecated */
  getMessageBuilderOld() {
    if (!this.messageBuilder) {
      this.messageBuilder = new MessageBuilder(this);
    }

    return this.messageBuilder;
  }

  genUniqueId(messageId: string, chatId: string) {
    if (!messageId || !chatId) {
      return null;
    }

    return `${this.transport}-${chatId}-${messageId}`;
  }

  async getContext(moduleId: BotModuleId, chatId: string = null) {
    const { owner, ownerType } = this.getContextOwner();

    const defaultContextData = ModuleList.find((module) => module.id === moduleId).contextData;

    if (!defaultContextData) {
      return null;
    }

    const where = { owner, ownerType, module: moduleId, chatId };

    const [context] = await Context.findOrCreate({
      where,
      defaults: { data: defaultContextData },
    });

    // TODO: Async migration start in bot, ensure migratins.
    // const [contextData, isModified] = mergeObjects(context.data, defaultContextData);

    // if (isModified) {
    //   context.data = contextData;
    //   await context.save();
    // }

    return context;
  }

  async getContextGroup(moduleId: BotModuleId) {
    const { owner, ownerType } = this.getContextOwnerGroup();

    const defaultContextData = ModuleList.find((module) => module.id === moduleId).contextGroupData;

    if (!defaultContextData) {
      return null;
    }

    const where = { owner, ownerType, module: moduleId };

    const [context] = await Context.findOrCreate({
      where,
      defaults: { data: defaultContextData },
    });

    // TODO: Async migration start in bot, ensure migratins. Look up.

    return context;
  }

  async getContextList(moduleId: BotModuleId, chatId: string = null) {
    const { ownerType } = this.getContextOwner();

    const contextList = await Context.findAll({
      where: { ownerType, module: moduleId, chatId },
    });

    return contextList;
  }

  async getModuleData<T extends ContextData>(moduleId: BotModuleId) {
    const context = await this.getContext(moduleId);

    if (!context) {
      return null;
    }

    return context.data as T;
  }

  async getLocalModuleData<T extends ContextData>(moduleId: BotModuleId) {
    if (!this.chatId) {
      throw new BotError('Unknown error');
    }

    const context = await this.getContext(moduleId, this.chatId);

    if (!context) {
      return null;
    }

    return context.data as T;
  }

  async getAllLocalModuleData<T extends ContextData>(moduleId: BotModuleId) {
    if (!this.chatId) {
      throw new BotError('Unknown error');
    }

    const contextList = await this.getContextList(moduleId, this.chatId);

    if (!Array.isArray(contextList)) {
      return null;
    }

    return contextList.map((context) => context as Context<T>);
  }

  async getGroupModuleData<T extends ContextData>(moduleId: BotModuleId) {
    if (!this.isGroup) {
      return null;
    }

    const context = await this.getContextGroup(moduleId);

    if (!context) {
      return null;
    }

    return context.data as T;
  }

  async setModuleData<T extends ContextData>(moduleId: BotModuleId, data: T) {
    const context = await this.getContext(moduleId);

    if (!context) {
      return null;
    }

    const result = await context.update({ data });

    return result.data as T;
  }

  async setLocalModuleData<T extends ContextData>(moduleId: BotModuleId, data: T) {
    if (!this.chatId) {
      throw new BotError('Unknown error');
    }

    const context = await this.getContext(moduleId, this.chatId);

    if (!context) {
      return null;
    }

    const result = await context.update({ data });

    return result.data as T;
  }

  async setModuleDataPartial<T extends ContextData>(moduleId: BotModuleId, data: Partial<T>) {
    const context = await this.getContext(moduleId);

    if (!context) {
      return null;
    }

    const result = await context.update({ data: { ...context.data, ...data } });

    return result.data as T;
  }

  async setGroupModuleData<T extends ContextData>(moduleId: BotModuleId, data: T) {
    if (!this.isGroup) {
      return null;
    }

    const context = await this.getContextGroup(moduleId);

    if (!context) {
      return null;
    }

    const result = await context.update({ data });

    return result.data as T;
  }
}
