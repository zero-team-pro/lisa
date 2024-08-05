import * as Mdast from 'mdast';

import { BaseMessage } from '@/controllers/baseMessage';
import { DiscordMessage } from '@/controllers/discord/discordMessage';
import { TelegramMessage } from '@/controllers/telegram/telegramMessage';
import { processMarkdown } from '@/utils';

type Message = BaseMessage | DiscordMessage | TelegramMessage;

interface FieldOptions {
  isTitleEmphasis?: boolean;
  isValueCode?: boolean;
}

type FlexibleContent = [string, string] | Mdast.PhrasingContent[];

// TODO: escapeCharacters should be diffrennt for earch transport.
export class MessageBuilderMdast {
  private content: Mdast.Root = { type: 'root', children: [] };
  private message: Message | null;

  constructor(message: Message | null) {
    this.message = message;
  }

  getMessage() {
    return this.content;
  }

  async reply() {
    if (!this.message) {
      console.log('Calling message builder reply without message');
      return;
    }

    return await this.message?.replyLong(this.content);
  }

  result() {
    return processMarkdown(this.content).join('');
  }

  add(node: Mdast.RootContent) {
    this.content.children.push(node);
  }

  text(text: string): Mdast.Text {
    return { type: 'text', value: text ?? 'null' };
  }

  bold(text: string): Mdast.Strong {
    return { type: 'strong', children: [this.text(text)] };
  }

  emphasis(text: string): Mdast.Emphasis {
    return { type: 'emphasis', children: [this.text(text)] };
  }

  inlineCode(text: string): Mdast.InlineCode {
    return { type: 'inlineCode', value: text };
  }

  addEmptyLine() {
    this.add({ type: 'break' });
  }

  addLine(text: string) {
    this.add({ type: 'paragraph', children: [this.text(text)] });
  }

  addLineRaw(children: Mdast.PhrasingContent[]) {
    this.add({ type: 'paragraph', children });
  }

  addFieldLine(title: string, text: string, options: FieldOptions = {}) {
    this.add({ type: 'paragraph', children: [options.isTitleEmphasis ? this.emphasis(title) : this.bold(title)] });
    this.add({ type: 'paragraph', children: [this.text(text)] });
  }

  addField(title: string, text: string, separator = ': ', options: FieldOptions = {}) {
    const titleChildren = options.isTitleEmphasis ? this.emphasis(title) : this.bold(title);

    this.add({
      type: 'paragraph',
      children: [titleChildren, this.text(separator), this.text(text)],
    });
  }

  addFieldCode(title: string, text: string, separator = ': ') {
    this.add({
      type: 'paragraph',
      children: [this.text(title), this.text(separator), this.inlineCode(text)],
    });
  }

  addFieldsParagraph(title: string, fields: FlexibleContent[]) {
    this.add({ type: 'paragraph', children: [this.bold(title)] });

    fields.map((field: [string, string] | Mdast.PhrasingContent[]) => {
      if (Array.isArray(field) && field.every((item) => typeof item === 'string' || item === null)) {
        const [fieldTitle, text] = field as [string, string];
        this.add({ type: 'paragraph', children: [this.emphasis(fieldTitle), this.text(': '), this.text(text)] });
      } else if (Array.isArray(field) && field.every((item) => typeof item !== 'string')) {
        this.add({ type: 'paragraph', children: field as Mdast.PhrasingContent[] });
      }
    });
  }
}
