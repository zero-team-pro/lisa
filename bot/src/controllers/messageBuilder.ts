import { Telegram } from 'telegraf';

import { escapeCharacters } from '@/utils';

interface LineOptions {
  raw?: boolean;
}

export class MessageBuilder {
  private message = '';
  private telegram: Telegram;
  private chatId: string | number;

  constructor(telegram: Telegram, chatId: string | number) {
    this.telegram = telegram;
    this.chatId = chatId;
  }

  getMessage() {
    return this.message;
  }

  addEmptyLine() {
    if (this.message !== '') {
      this.message += '\n';
    }
  }

  addLine(content: string, options?: LineOptions) {
    this.addEmptyLine();

    this.message += options?.raw ? content : escapeCharacters(content);
  }

  addBoldLine(content: string, options?: LineOptions) {
    this.addEmptyLine();

    this.message += options?.raw ? `*${content}*` : `*${escapeCharacters(content)}*`;
  }

  async reply() {
    return await this.telegram.sendMessage(this.chatId, this.message, { parse_mode: 'MarkdownV2' });
  }
}
