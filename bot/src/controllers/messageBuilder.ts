import { BaseMessage } from '@/controllers/baseMessage';
import { DiscordMessage } from '@/controllers/discord/discordMessage';
import { TelegramMessage } from '@/controllers/telegram/telegramMessage';
import { Transport } from '@/types';
import { escapeCharacters } from '@/utils';

interface LineOptions {
  raw?: boolean;
}

type Message = BaseMessage | DiscordMessage | TelegramMessage;

// TODO: escapeCharacters should be diffrennt for earch transport.
export class MessageBuilder {
  private content = '';
  private message: Message;

  constructor(message: Message) {
    this.message = message;
  }

  getMessage() {
    return this.content;
  }

  async reply() {
    return await this.message.replyWithMarkdown(this.content);
  }

  bold(text: string) {
    switch (this.message.transport) {
      case Transport.Discord:
        return `**${escapeCharacters(text)}**`;
      case Transport.Telegram:
        return `*${escapeCharacters(text)}*`;
      default:
        return `*${escapeCharacters(text)}*`;
    }
  }

  italic(text: string) {
    switch (this.message.transport) {
      case Transport.Discord:
        return `*${escapeCharacters(text)}*`;
      case Transport.Telegram:
        return `_${escapeCharacters(text)}_`;
      default:
        return `_${escapeCharacters(text)}_`;
    }
  }

  code(text: string) {
    switch (this.message.transport) {
      case Transport.Discord:
        return `\`${escapeCharacters(text)}\``;
      case Transport.Telegram:
        return `\`${escapeCharacters(text)}\``;
      default:
        return `\`${escapeCharacters(text)}\``;
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

  addFieldReverse(title: string, text: string) {
    this.addEmptyLine();

    this.content += `${escapeCharacters(title)} \\- ${this.bold(escapeCharacters(text))}`;
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
}
