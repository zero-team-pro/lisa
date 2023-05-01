import { escapeCharacters } from '@/utils';
import { Transport } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';
import { DiscordMessage } from '@/controllers/discordMessage';
import { TelegramMessage } from '@/controllers/telegramMessage';

interface LineOptions {
  raw?: boolean;
}

type Message = BaseMessage | DiscordMessage | TelegramMessage;

export class MessageBuilder {
  private content = '';
  private message: Message;

  constructor(message: Message, chatId?: string | number) {
    this.message = message;
  }

  getMessage() {
    return this.content;
  }

  bold(text: string) {
    switch (this.message.transport) {
      case Transport.Discord:
        return `**${text}**`;
      case Transport.Telegram:
        return `*${text}*`;
      default:
        return `*${text}*`;
    }
  }

  italic(text: string) {
    switch (this.message.transport) {
      case Transport.Discord:
        return `*${text}*`;
      case Transport.Telegram:
        return `_${text}_`;
      default:
        return `_${text}_`;
    }
  }

  code(text: string) {
    switch (this.message.transport) {
      case Transport.Discord:
        return `\`${text}\``;
      case Transport.Telegram:
        return `\`${text}\``;
      default:
        return `\`${text}\``;
    }
  }

  addEmptyLine() {
    if (this.content !== '') {
      this.content += '\n';
    }
  }

  addHeader(text: string, options?: LineOptions) {
    this.addEmptyLine();

    this.content += options?.raw ? this.bold(text) : this.bold(escapeCharacters(text));

    this.addEmptyLine();
  }

  addLine(text: string, options?: LineOptions) {
    this.addEmptyLine();

    this.content += options?.raw ? text : escapeCharacters(text);
  }

  addBoldLine(text: string, options?: LineOptions) {
    this.addEmptyLine();

    this.content += options?.raw ? this.bold(text) : this.bold(escapeCharacters(text));
  }

  addObject(obj: Record<string, string | number>) {
    if (typeof obj !== 'object') {
      // TODO: Should I do this?
      this.addEmptyLine();
      this.content += '[Output error]';
      return;
    }

    Object.keys(obj).map((key) => {
      this.addEmptyLine();
      this.content += `${this.bold(escapeCharacters(key))} \\- ${escapeCharacters(obj[key].toString())}`;
    });
  }

  addFieldLine(title: string, text: string) {
    this.addEmptyLine();

    this.content += `${this.bold(escapeCharacters(title))}\n${escapeCharacters(text)}`;
  }

  addField(title: string, text: string) {
    this.addEmptyLine();

    this.content += `${this.bold(escapeCharacters(title))} \\- ${escapeCharacters(text)}`;
  }

  addFieldItalicLine(title: string, text: string) {
    this.addEmptyLine();

    this.content += `${this.italic(escapeCharacters(title))}\n${escapeCharacters(text)}`;
  }

  addFieldItalic(title: string, text: string) {
    this.addEmptyLine();

    this.content += `${this.italic(escapeCharacters(title))} \\- ${escapeCharacters(text)}`;
  }

  addFieldCode(title: string, text: string) {
    this.addEmptyLine();

    this.content += `${escapeCharacters(title)}\\: ${this.code(escapeCharacters(text))}`;
  }

  addFieldInfo(text: string, info: string) {
    this.addEmptyLine();

    this.content += `${escapeCharacters(text)}\\: ${this.bold(escapeCharacters(info))}`;
  }

  async reply() {
    return await this.message.replyWithMarkdown(this.content);
  }
}
