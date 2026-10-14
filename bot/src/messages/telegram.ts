import type { MessageEntity } from 'telegraf/types';
import { appendRun, documentText, preferredCut, safeLink } from './document';
import type { Marks, MessageDocument, MessageInput } from './document';
import { normalizeMessage } from './sources';

export interface TelegramText {
  text: string;
  entities: MessageEntity[];
}

const entitiesFor = (marks: Marks, offset: number, length: number): MessageEntity[] => {
  if (marks.pre) return [{ type: 'pre', offset, length, ...(marks.language ? { language: marks.language } : {}) }];
  if (marks.code) return [{ type: 'code', offset, length }];
  const entities: MessageEntity[] = [];
  for (const [key, type] of Object.entries({
    bold: 'bold',
    italic: 'italic',
    underline: 'underline',
    strike: 'strikethrough',
    spoiler: 'spoiler',
    quote: 'blockquote',
  })) {
    if (marks[key]) entities.push({ type, offset, length } as MessageEntity);
  }
  const link = marks.link && safeLink(marks.link);
  if (link) entities.push({ type: 'text_link', offset, length, url: link });
  return entities;
};

/** Split visible text first; entity offsets are rebuilt independently per chunk. */
export const renderTelegram = (document: MessageDocument, limit = 4096): TelegramText[] => {
  if (!Number.isInteger(limit) || limit < 2) throw new Error('Telegram message limit must be >= 2');
  const result: TelegramText[] = [];
  let chunk: TelegramText = { text: '', entities: [] };
  const flush = () => {
    if (chunk.text) {
      // A blockquote surrounds a whole contiguous region, including inline marks.
      const quotes: MessageEntity[] = [];
      for (const entity of chunk.entities.filter((entity) => entity.type === 'blockquote')) {
        const previous = quotes.at(-1);
        if (previous && previous.offset + previous.length === entity.offset) previous.length += entity.length;
        else quotes.push({ ...entity });
      }
      chunk.entities = [...chunk.entities.filter((entity) => entity.type !== 'blockquote'), ...quotes].sort(
        (a, b) => a.offset - b.offset || b.length - a.length,
      );
      result.push(chunk);
    }
    chunk = { text: '', entities: [] };
  };
  // Coalesce equal adjacent styles, including incoming entity segments.
  const normalized: MessageDocument = { runs: [] };
  document.runs.forEach((run) => appendRun(normalized, run.text, run.marks));
  for (const run of normalized.runs) {
    let text = run.text;
    while (text) {
      if (chunk.text.length >= limit || chunk.entities.length + entitiesFor(run.marks, 0, 1).length > 90) flush();
      // A single remaining UTF-16 unit cannot hold an astral character.
      if (limit - chunk.text.length < 2 && /[\uD800-\uDBFF]/.test(text[0])) flush();
      const available = limit - chunk.text.length;
      const end = available === 1 ? 1 : preferredCut(text, available);
      const part = text.slice(0, end);
      chunk.entities.push(...entitiesFor(run.marks, chunk.text.length, part.length));
      chunk.text += part;
      text = text.slice(end);
      if (text) flush();
    }
  }
  flush();
  return result;
};

const isEntityError = (error: any) =>
  error?.response?.error_code === 400 &&
  /can't parse entities|cannot parse entities|entity.*(?:offset|length|bound)|entities.*(?:offset|length|bound)/i.test(
    error.response.description ?? '',
  );

/** Retry only a rejected formatted chunk, never already delivered chunks. */
export const sendTelegram = async <T>(
  input: MessageInput,
  send: (payload: TelegramText) => Promise<T>,
): Promise<T[]> => {
  const document = await normalizeMessage(input);
  if (!documentText(document).trim()) throw new Error('Cannot send an empty message');
  const results: T[] = [];
  for (const chunk of renderTelegram(document)) {
    try {
      results.push(await send(chunk));
    } catch (error) {
      if (!chunk.entities.length || !isEntityError(error)) throw error;
      results.push(await send({ text: chunk.text, entities: [] }));
    }
  }
  return results;
};
