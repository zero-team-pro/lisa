import * as Mdast from 'mdast';

import type { BaseMessage } from '@/controllers/baseMessage';
import { mdastMessage } from '@/messages/document';

type Message = Pick<BaseMessage, 'replyMessage'>;

interface FieldOptions {
  isTitleEmphasis?: boolean;
}

type FlexibleContent = [string, string] | Mdast.PhrasingContent[];

export class MessageBuilder {
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

    return await this.message.replyMessage(mdastMessage(this.content));
  }

  result() {
    return mdastMessage(this.content);
  }

  addHeader(text: string) {
    this.addLineRaw([this.bold(text)]);
  }

  addBoldLine(text: string) {
    this.addHeader(text);
  }

  italic(text: string) {
    return this.emphasis(text);
  }

  addObject(object: Record<string, string | number>) {
    Object.entries(object).forEach(([key, value]) => this.addField(key, String(value)));
  }

  addFieldReverse(title: string, text: string) {
    this.addLineRaw([this.text(title), this.text(': '), this.bold(text)]);
  }

  addFieldItalic(title: string, text: string) {
    this.addField(title, text, ': ', { isTitleEmphasis: true });
  }

  addFieldInfo(text: string, info: string) {
    this.addLineRaw([this.text(text + ': '), this.bold(info)]);
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
