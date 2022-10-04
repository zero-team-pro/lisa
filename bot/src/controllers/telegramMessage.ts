import { Context, Telegram } from 'telegraf';
import { Update, UserFromGetMe } from 'typegram';
import { PropOr } from 'telegraf/typings/deunionize';

import { AdminUser, TelegramUser } from '../models';

// TODO: Types (in custom functions)
export class TelegramMessage extends Context {
  constructor(update: Update, telegram: Telegram, botInfo: UserFromGetMe) {
    console.log('Creating context for %j', update);
    super(update, telegram, botInfo);
  }

  // reply(...args: Parameters<Context['reply']>) {
  reply(text: string, ...args) {
    console.log('reply called with text: %j, args: %j', text, args);
    return super.reply(text);
  }

  get message(): PropOr<Update, 'message', undefined> {
    return super.message;
  }

  get content(): string {
    const message = super.message as any;

    if (typeof message?.text !== 'string') {
      return '';
    }
    return message.text;
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
