import { escapeCharacters } from '@/utils';
import { Transport } from '@/types';
import { DiscordMessage } from '@/controllers/discordMessage';
import { TelegramMessage } from '@/controllers/telegramMessage';

interface LineOptions {
  raw?: boolean;
}

type Message = DiscordMessage | TelegramMessage;

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

  addLine(text: string, options?: LineOptions) {
    this.addEmptyLine();

    this.content += options?.raw ? text : escapeCharacters(text);
  }

  addBoldLine(text: string, options?: LineOptions) {
    this.addEmptyLine();

    this.content += options?.raw ? this.bold(text) : this.bold(escapeCharacters(text));
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

  async reply() {
    switch (this.message.transport) {
      case Transport.Discord:
        return await this.message.reply(this.content);
      case Transport.Telegram:
        return await this.message.raw.sendMessage(this.message.message.chat.id, this.content, {
          parse_mode: 'MarkdownV2',
        });
    }
  }
}
