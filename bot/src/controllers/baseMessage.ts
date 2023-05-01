import { Message } from 'discord.js';
import { Context as TelegramContext } from 'telegraf';

import { AdminUser, Context, TelegramUser, User } from '@/models';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { BotModuleId, OwnerType, Transport } from '@/types';
import { ModuleList } from '@/modules';

export abstract class BaseMessage {
  private messageBuilder: MessageBuilder;

  abstract get transport(): Transport;
  abstract get raw(): Message<boolean> | TelegramContext;
  abstract get content(): string;

  abstract reply(text: string): Promise<any>;
  abstract replyWithMarkdown(text: string): Promise<any>;

  abstract getUser(): Promise<TelegramUser | User | null>;
  abstract getAdmin(): Promise<AdminUser | null>;

  abstract getContextOwner(): { owner: string; ownerType: OwnerType };

  getMessageBuilder() {
    if (!this.messageBuilder) {
      this.messageBuilder = new MessageBuilder(this);
    }

    return this.messageBuilder;
  }

  async getContext(moduleId: BotModuleId) {
    const { owner, ownerType } = this.getContextOwner();

    const defaultContextData = ModuleList.find((module) => module.id === moduleId).contextData;

    if (!defaultContextData) {
      return null;
    }

    const [context] = await Context.findOrCreate({
      where: { owner, ownerType, module: moduleId },
      defaults: { data: defaultContextData },
    });

    // TODO: Check context data and update if needed. Later: migrations

    return context;
  }

  async getModuleData<T>(moduleId: BotModuleId) {
    const context = await this.getContext(moduleId);

    if (!context) {
      return null;
    }

    return context.data as T;
  }

  async setModuleData<T>(moduleId: BotModuleId, data: T) {
    const context = await this.getContext(moduleId);

    if (!context) {
      return null;
    }

    const result = await context.update({ data });

    return result.data as T;
  }

  async setModuleDataPartial<T>(moduleId: BotModuleId, data: Partial<T>) {
    const context = await this.getContext(moduleId);

    if (!context) {
      return null;
    }

    const result = await context.update({ data: { ...context.data, ...data } });

    return result.data as T;
  }
}
