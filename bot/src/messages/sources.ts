import type { Root } from 'mdast';
import { appendRun, safeLink } from './document';
import type { Marks, MessageDocument, MessageInput } from './document';

type AstNode = { type: string; value?: string; children?: AstNode[]; [key: string]: any };

export const fromMdast = (root: Root): MessageDocument => {
  const document: MessageDocument = { runs: [] };
  const definitions = new Map<string, AstNode>();
  const collect = (node: AstNode) => {
    if (node.type === 'definition') definitions.set(node.identifier, node);
    node.children?.forEach(collect);
  };
  collect(root as AstNode);
  let trailingStructuralBreak = false;
  const add = (text: string, marks: Marks, structural = false) => {
    appendRun(document, text, marks);
    trailingStructuralBreak = structural;
  };
  const walk = (node: AstNode, marks: Marks = {}, depth = 0) => {
    const children = (next = marks) => node.children?.forEach((child) => walk(child, next, depth));
    switch (node.type) {
      case 'root':
        children();
        break;
      case 'text':
      case 'html':
      case 'yaml':
        add(node.value ?? '', marks);
        break;
      case 'paragraph':
        children();
        add('\n', marks.quote ? { quote: true } : {}, true);
        break;
      case 'heading':
        children({ ...marks, bold: true });
        add('\n', {}, true);
        break;
      case 'strong':
        children({ ...marks, bold: true });
        break;
      case 'emphasis':
        children({ ...marks, italic: true });
        break;
      case 'delete':
        children({ ...marks, strike: true });
        break;
      case 'underline':
        children({ ...marks, underline: true });
        break;
      case 'inlineCode':
        add(node.value ?? '', { code: true });
        break;
      case 'code':
        add(node.value ?? '', { pre: true, language: node.lang });
        add('\n', {}, true);
        break;
      case 'blockquote':
        children({ ...marks, quote: true });
        break;
      case 'break':
        add('\n', marks);
        break;
      case 'thematicBreak':
        add('───\n', {});
        break;
      case 'list':
        node.children?.forEach((item, index) => {
          add('  '.repeat(depth) + (node.ordered ? `${(node.start ?? 1) + index}. ` : '• '), marks);
          if (typeof item.checked === 'boolean') add(item.checked ? '☑ ' : '☐ ', marks);
          item.children?.forEach((child) => walk(child, marks, depth + 1));
        });
        break;
      case 'link':
      case 'linkReference': {
        const target = node.type === 'link' ? node : definitions.get(node.identifier);
        const link = target && safeLink(target.url);
        children(link ? { ...marks, link } : marks);
        if (target && !link) add(` (${target.url})`, marks);
        break;
      }
      case 'image':
      case 'imageReference': {
        const target = node.type === 'image' ? node : definitions.get(node.identifier);
        const label = node.alt || 'Image';
        const link = target && safeLink(target.url);
        add(label, link ? { ...marks, link } : marks);
        if (target && !link) add(` (${target.url})`, marks);
        break;
      }
      case 'table':
        node.children?.forEach((row) => {
          row.children?.forEach((cell, index) => {
            if (index) add(' | ', marks);
            walk(cell, marks, depth);
          });
          add('\n', {}, true);
        });
        break;
      case 'definition':
        break;
      case 'footnoteReference':
        add(`[${node.label ?? node.identifier}]`, marks);
        break;
      case 'footnoteDefinition':
        add(`[${node.label ?? node.identifier}] `, marks);
        children();
        break;
      default:
        // Unsupported structure degrades to readable content, never a placeholder.
        if (node.children) children();
        else if (typeof node.value === 'string') add(node.value, marks);
    }
  };
  walk(root as AstNode);
  // Block adapters add one structural final newline; retain intentional code whitespace.
  const last = document.runs.at(-1);
  if (trailingStructuralBreak && last?.text.endsWith('\n') && !last.marks.pre && !last.marks.code) {
    last.text = last.text.slice(0, -1);
    if (!last.text) document.runs.pop();
  }
  return document;
};

export const fromMarkdown = async (text: string): Promise<MessageDocument> => {
  const [{ unified }, { default: parse }, { default: gfm }] = await Promise.all([
    import('unified'),
    import('remark-parse'),
    import('remark-gfm'),
  ]);
  return fromMdast(unified().use(parse).use(gfm).parse(text));
};

/** Slate persistence stays JSON; it is only an input adapter, not another renderer. */
export const fromSlate = (json: string): MessageDocument => {
  const nodes: unknown = JSON.parse(json);
  if (!Array.isArray(nodes)) throw new Error('Article content must be a Slate array');
  const document: MessageDocument = { runs: [] };
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') throw new Error('Invalid Slate node');
    if (typeof node.text === 'string') {
      appendRun(document, node.text, {
        bold: node.bold,
        italic: node.italic,
        underline: node.underline,
        code: node.code,
      });
    } else if (Array.isArray(node.children)) node.children.forEach(walk);
    else throw new Error('Invalid Slate content');
  };
  nodes.forEach((node, index) => {
    if (index) appendRun(document, '\n');
    walk(node);
  });
  return document;
};

export interface IncomingEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  language?: string;
  user?: { id: number };
}

/** Convert incoming Telegram text + UTF-16 entities without changing command text. */
export const fromTelegram = (text: string, entities: IncomingEntity[] = []): MessageDocument => {
  const valid = entities.filter(
    (entity) =>
      Number.isInteger(entity.offset) &&
      Number.isInteger(entity.length) &&
      entity.offset >= 0 &&
      entity.length > 0 &&
      entity.offset + entity.length <= text.length,
  );
  const cuts = [
    ...new Set([0, text.length, ...valid.flatMap((entity) => [entity.offset, entity.offset + entity.length])]),
  ].sort((a, b) => a - b);
  const document: MessageDocument = { runs: [] };
  for (let index = 0; index < cuts.length - 1; index++) {
    const start = cuts[index],
      end = cuts[index + 1];
    const marks: Marks = {};
    for (const entity of valid.filter((entity) => entity.offset <= start && entity.offset + entity.length >= end)) {
      switch (entity.type) {
        case 'bold':
          marks.bold = true;
          break;
        case 'italic':
          marks.italic = true;
          break;
        case 'underline':
          marks.underline = true;
          break;
        case 'strikethrough':
          marks.strike = true;
          break;
        case 'spoiler':
          marks.spoiler = true;
          break;
        case 'code':
          marks.code = true;
          break;
        case 'pre':
          marks.pre = true;
          marks.language = entity.language;
          break;
        case 'blockquote':
        case 'expandable_blockquote':
          marks.quote = true;
          break;
        case 'text_link':
          marks.link = entity.url && safeLink(entity.url);
          break;
        case 'text_mention':
          marks.link = entity.user && `tg://user?id=${entity.user.id}`;
          break;
      }
    }
    appendRun(document, text.slice(start, end), marks);
  }
  return document;
};

export const normalizeMessage = async (input: MessageInput): Promise<MessageDocument> => {
  switch (input.format) {
    case 'text':
      return { runs: [{ text: input.text, marks: {} }] };
    case 'markdown':
      return fromMarkdown(input.text);
    case 'mdast':
      return fromMdast(input.root);
    case 'document':
      return input.document;
    default:
      throw new Error('Unknown message format');
  }
};
