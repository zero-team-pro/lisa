import { Context, Telegram } from 'telegraf';
import { Update, UserFromGetMe } from 'typegram';
import { PropOr } from 'telegraf/typings/deunionize';
import * as tt from 'telegraf/typings/telegram-types';

import { AdminUser, TelegramUser } from '@/models';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { Transport } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';

export class TelegramMessage extends Context implements BaseMessage {
  private messageBuilder: MessageBuilder;

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
