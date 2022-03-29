import { Context, Telegram } from 'telegraf';
import { Update, UserFromGetMe } from 'typegram';
import { PropOr } from 'telegraf/typings/deunionize';

// TODO: Types (in custom functions)
export class TelegramMessage extends Context {
  constructor(update: Update, telegram: Telegram, botInfo: UserFromGetMe) {
    console.log('Creating context for %j', update);
    super(update, telegram, botInfo);
  }

  reply(...args: Parameters<Context['reply']>) {
    console.log('reply called with args: %j', args);
    return super.reply(...args);
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
}
