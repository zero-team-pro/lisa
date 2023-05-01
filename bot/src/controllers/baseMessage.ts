import { Message } from 'discord.js';
import { Context as TelegramContext } from 'telegraf';

import { AdminUser, Context, TelegramUser, User } from '@/models';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { BotModuleId, ContextData, OwnerType, Transport } from '@/types';
import { ModuleList } from '@/modules';
import { BotError } from '@/controllers/botError';

type RawType<T> = T extends Transport.Discord
  ? Message<boolean>
  : T extends Transport.Telegram
  ? TelegramContext
  : unknown;

/*
 * Check example:

  if (message.transport === Transport.Telegram) {
    const telegramMessage = (message as BaseMessage<Transport.Telegram>).raw;
  }
*/

export abstract class BaseMessage<T extends Transport | unknown = unknown> {
  private transportType: Transport;
  private messageBuilder: MessageBuilder;
  private isMessageProcessed: boolean = false;

  constructor(transport: Transport) {
    this.transportType = transport;
  }

  get transport(): Transport {
    return this.transportType;
  }

  abstract get raw(): RawType<T>;

  abstract get content(): string;
  abstract get isGroup(): boolean;

  abstract reply(text: string): Promise<any>;
  abstract replyWithMarkdown(text: string): Promise<any>;

  abstract getUser(): Promise<TelegramUser | User | null>;
  abstract getUserNameById(id: string | number): Promise<string>;
  abstract getAdmin(): Promise<AdminUser | null>;
  abstract getChatId(): string | null;

  abstract getContextOwner(): { owner: string; ownerType: OwnerType };

  get isProcessed() {
    return this.isMessageProcessed;
  }

  markProcessed() {
    this.isMessageProcessed = true;
  }

  getMessageBuilder() {
    if (!this.messageBuilder) {
      this.messageBuilder = new MessageBuilder(this);
    }

    return this.messageBuilder;
  }

  async getContext(moduleId: BotModuleId, chatId: string = null) {
    const { owner, ownerType } = this.getContextOwner();

    const defaultContextData = ModuleList.find((module) => module.id === moduleId).contextData;

    if (!defaultContextData) {
      return null;
    }

    const [context] = await Context.findOrCreate({
      where: { owner, ownerType, module: moduleId, chatId },
      defaults: { data: defaultContextData },
    });

    // TODO: Check context data and update if needed. Later: migrations

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
    const chatId = await this.getChatId();
    if (!chatId) {
      throw new BotError('Unknown error');
    }

    const context = await this.getContext(moduleId, chatId);

    if (!context) {
      return null;
    }

    return context.data as T;
  }

  async getAllLocalModuleData<T extends ContextData>(moduleId: BotModuleId) {
    const chatId = await this.getChatId();
    if (!chatId) {
      throw new BotError('Unknown error');
    }

    const contextList = await this.getContextList(moduleId, chatId);

    if (!Array.isArray(contextList)) {
      return null;
    }

    return contextList.map((context) => context as Context<T>);
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
    const chatId = await this.getChatId();
    if (!chatId) {
      throw new BotError('Unknown error');
    }

    const context = await this.getContext(moduleId, chatId);

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
}
