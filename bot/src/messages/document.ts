import type { Root } from 'mdast';

export interface Marks {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  spoiler?: boolean;
  code?: boolean;
  pre?: boolean;
  language?: string;
  link?: string;
  quote?: boolean;
}
export interface TextRun {
  text: string;
  marks: Marks;
}
export interface MessageDocument {
  runs: TextRun[];
}
export type MessageInput =
  | { format: 'text'; text: string }
  | { format: 'markdown'; text: string }
  | { format: 'mdast'; root: Root }
  | { format: 'document'; document: MessageDocument };

export const textMessage = (text: string): MessageInput => ({ format: 'text', text });
export const markdownMessage = (text: string): MessageInput => ({ format: 'markdown', text });
export const mdastMessage = (root: Root): MessageInput => ({ format: 'mdast', root });
export const documentMessage = (document: MessageDocument): MessageInput => ({ format: 'document', document });
export const documentText = (document: MessageDocument): string => document.runs.map((run) => run.text).join('');

export const appendRun = (document: MessageDocument, text: string, marks: Marks = {}) => {
  if (!text) return;
  // Code cannot contain other entities. Keep this invariant across all adapters.
  const normalized: Marks = marks.pre
    ? { pre: true, ...(marks.language ? { language: marks.language } : {}) }
    : marks.code
      ? { code: true }
      : Object.fromEntries(Object.entries(marks).filter(([, value]) => value));
  const last = document.runs.at(-1);
  if (last && JSON.stringify(last.marks) === JSON.stringify(normalized)) last.text += text;
  else document.runs.push({ text, marks: normalized });
};

/** All offsets are UTF-16, like Telegram. Never cut a surrogate pair. */
export const safeCut = (text: string, maxLength: number): number => {
  if (!Number.isInteger(maxLength) || maxLength < 2) throw new Error('Message limit must be an integer >= 2');
  let end = Math.min(text.length, maxLength);
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end -= 1;
  return end;
};

export const preferredCut = (text: string, maxLength: number): number => {
  const end = safeCut(text, maxLength);
  if (end === text.length) return end;
  const candidate = text.slice(0, end);
  const boundary = Math.max(candidate.lastIndexOf('\n'), candidate.lastIndexOf(' '));
  return boundary >= end / 2 ? boundary + 1 : end;
};

export const safeLink = (value: string): string | undefined => {
  try {
    const url = new URL(value);
    if (['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) return url.href;
    if (url.protocol === 'tg:' && url.hostname === 'user' && /^\d+$/.test(url.searchParams.get('id') ?? ''))
      return url.href;
  } catch {
    // Relative/local paths remain visible text, never clickable bot links.
  }
  return undefined;
};

export const sliceDocument = (document: MessageDocument, start: number): MessageDocument => {
  const result: MessageDocument = { runs: [] };
  let offset = 0;
  for (const run of document.runs) {
    const end = offset + run.text.length;
    if (end > start) appendRun(result, run.text.slice(Math.max(0, start - offset)), run.marks);
    offset = end;
  }
  return result;
};
