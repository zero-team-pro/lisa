import { appendRun, documentText, safeCut, safeLink } from './document';
import type { Marks, MessageDocument } from './document';

const escapeText = (text: string) => text.replace(/[\\`*_~|\[\]()>#]/g, '\\$&');
const destination = (url: string) =>
  url.replace(/[()<>\s]/g, (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase());

const renderRun = (text: string, marks: Marks, atLineStart = true): string => {
  if (marks.quote) {
    return text
      .split('\n')
      .map(
        (line, index) =>
          (line && (index > 0 || atLineStart) ? '> ' : '') + (line ? renderRun(line, { ...marks, quote: false }) : ''),
      )
      .join('\n');
  }
  let result: string;
  if (marks.pre && !text.includes('```')) {
    const language = (marks.language ?? '').replace(/[^a-zA-Z0-9_+-]/g, '');
    result = `\`\`\`${language}\n${text}\n\`\`\``;
  } else if (marks.code && !/[`\n]/.test(text)) result = `\`${text}\``;
  else {
    result = escapeText(text);
    if (!marks.code && !marks.pre) {
      if (marks.bold) result = `**${result}**`;
      if (marks.italic) result = `_${result}_`;
      if (marks.underline) result = `__${result}__`;
      if (marks.strike) result = `~~${result}~~`;
      if (marks.spoiler) result = `||${result}||`;
      const link = marks.link && safeLink(marks.link);
      if (link) result = `[${result}](${destination(link)})`;
    }
  }
  return result;
};

/** Every chunk closes its own Markdown wrappers; count serialized characters. */
export const renderDiscord = (document: MessageDocument, limit = 2000): string[] => {
  if (!Number.isInteger(limit) || limit < 32) throw new Error('Discord message limit must be >= 32');
  const chunks: string[] = [];
  let current = '';
  const normalized: MessageDocument = { runs: [] };
  document.runs.forEach((run) => appendRun(normalized, run.text, run.marks));
  for (const run of normalized.runs) {
    let text = run.text;
    let marks = run.marks;
    // A pathological URL must not consume the whole message budget.
    if (renderRun('😀', marks).length > limit) {
      text += marks.link ? ` (${marks.link})` : '';
      marks = {};
    }
    while (text) {
      const available = limit - current.length;
      let low = 0,
        high = Math.min(text.length, available),
        best = 0;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const end = middle < 2 ? middle : safeCut(text, middle);
        if (renderRun(text.slice(0, end), marks, !current || current.endsWith('\n')).length <= available) {
          best = end;
          low = middle + 1;
        } else high = middle - 1;
      }
      if (best === 1 && /[\uD800-\uDBFF]/.test(text[0])) best = 0;
      if (!best) {
        if (!current) throw new Error('Unable to fit Discord text');
        chunks.push(current);
        current = '';
        continue;
      }
      current += renderRun(text.slice(0, best), marks, !current || current.endsWith('\n'));
      text = text.slice(best);
      if (text) {
        chunks.push(current);
        current = '';
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

/** Semantic Markdown for AI context, not a copy of the platform's rendered text. */
export const contextMarkdown = (document: MessageDocument): string =>
  renderDiscord(
    document,
    Math.max(
      2000,
      documentText(document).length * 8 +
        document.runs.reduce((sum, run) => sum + (run.marks.link?.length ?? 0) + 100, 0),
    ),
  ).join('');
