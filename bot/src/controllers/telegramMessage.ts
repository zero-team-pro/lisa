import { Context as TelegramContext, Telegram } from 'telegraf';
import { Update, UserFromGetMe } from 'typegram';
import { PropOr } from 'telegraf/typings/deunionize';
import * as tt from 'telegraf/typings/telegram-types';

import { AdminUser, Context, TelegramUser } from '@/models';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { BotModuleId, DataOwner, Transport } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';
import { ModuleList } from '@/modules';

export class TelegramMessage extends TelegramContext implements BaseMessage {
  private messageBuilder: MessageBuilder;
  private moduleId: BotModuleId;

  constructor(update: Update, telegram: Telegram, botInfo: UserFromGetMe) {
    console.log('Creating context for %j', update);
    super(update, telegram, botInfo);
  }

  get transport() {
    return Transport.Telegram as const;
  }

  get raw() {
    return this.telegram;
  }

  get message(): PropOr<Update, 'message'> {
    return super.message;
  }

  get content() {
    const message = super.message as any;

    if (typeof message?.text !== 'string') {
      return '';
    }
    return message.text;
  }

  reply(text: string, extra?: tt.ExtraReplyMessage) {
    console.log('reply called with text: %j, extra: %j', text, extra);
    return super.reply(text, extra);
  }

  getMessageBuilder() {
    if (!this.messageBuilder) {
      this.messageBuilder = new MessageBuilder(this);
    }

    return this.messageBuilder;
  }

  setModule(moduleId: BotModuleId) {
    this.moduleId = moduleId;
  }

  private async getContext() {
    const owner = `${this.message.from.id}`;

    const defaultContextData = ModuleList.find((module) => module.id === this.moduleId).contextData;

    if (!defaultContextData) {
      return null;
    }

    const [context] = await Context.findOrCreate({
      where: { owner, ownerType: DataOwner.telegramUser, module: this.moduleId },
      defaults: { data: defaultContextData },
    });

    // TODO: Check context data and update if needed. Later: migrations

    return context;
  }

  async getModuleData<T>() {
    const context = await this.getContext();

    if (!context) {
      return null;
    }

    return context.data as T;
  }

  async setModuleData<T>(data: T) {
    const context = await this.getContext();

    if (!context) {
      return null;
    }

    const result = await context.update({ data });

    return result.data as T;
  }

  async setModuleDataPartial<T>(data: Partial<T>) {
    const context = await this.getContext();

    if (!context) {
      return null;
    }

    const result = await context.update({ data: { ...context.data, ...data } });

    return result.data as T;
  }

  async getUser(): Promise<TelegramUser | null> {
    try {
      return await TelegramUser.findByPk(super.message?.from?.id);
    } catch (err) {
      return null;
    }
  }

  async getAdmin(): Promise<AdminUser | null> {
    try {
      const telegramUser = await TelegramUser.findByPk(super.message?.from?.id, { include: [AdminUser] });
      return telegramUser.admin;
    } catch (err) {
      return null;
    }
  }
}
