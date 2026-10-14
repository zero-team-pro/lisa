import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  documentMessage,
  markdownMessage,
  mdastMessage,
  textMessage,
  documentText,
  sliceDocument,
} from '../dist/messages/document.js';
import { fromMarkdown, fromMdast, fromSlate, fromTelegram, normalizeMessage } from '../dist/messages/sources.js';
import { renderTelegram, sendTelegram } from '../dist/messages/telegram.js';
import { contextMarkdown, renderDiscord } from '../dist/messages/discord.js';
import { MessageBuilder } from '../dist/controllers/messageBuilder.js';

const visible = (chunks) => chunks.map((chunk) => chunk.text).join('');
const assertTelegram = (document, limit = 4096) => {
  const chunks = renderTelegram(document, limit);
  assert.equal(visible(chunks), documentText(document));
  for (const chunk of chunks) {
    assert.ok(chunk.text.length <= limit);
    assert.ok(!/[\uD800-\uDBFF]$/.test(chunk.text));
    assert.ok(!/^[\uDC00-\uDFFF]/.test(chunk.text));
    assert.ok(chunk.entities.length <= 100);
    for (const entity of chunk.entities) {
      assert.ok(entity.length > 0 && entity.offset >= 0 && entity.offset + entity.length <= chunk.text.length);
    }
  }
  return chunks;
};

test('plain text is explicit and retains literal Markdown, punctuation, whitespace and emoji', async () => {
  const text = '*literal* a_b.c \\ [label](path)\n\n  aaa bbb ccc 😀';
  const document = await normalizeMessage(textMessage(text));
  const chunks = assertTelegram(document, 12);
  assert.ok(chunks.every((chunk) => !chunk.entities.length));
});

test('CommonMark and GFM normalize to visible content and native entities', async () => {
  const document = await fromMarkdown(
    '# Title\n\n**bold** _italic_ ~~strike~~\n\n> quoted\n\n3. first\n4. second\n\n- [x] done\n\n| A | B |\n| - | - |\n| 1 | 2 |',
  );
  const chunks = assertTelegram(document);
  const text = visible(chunks);
  for (const value of [
    'Title',
    'bold',
    'italic',
    'strike',
    'quoted',
    '3. first',
    '4. second',
    '☑ done',
    'A | B',
    '1 | 2',
  ])
    assert.ok(text.includes(value), value);
  for (const type of ['bold', 'italic', 'strikethrough', 'blockquote'])
    assert.ok(
      chunks[0].entities.some((entity) => entity.type === type),
      type,
    );
  assert.ok(!text.includes('undefinedProcessor'));
});

test('formatted and reference links have intact labels, destinations and UTF-16 offsets', async () => {
  const document = await fromMarkdown(
    '😀 [**two** words](https://example.com/a_(b)) and [ref][id]\n\n[id]: https://example.org',
  );
  const [chunk] = assertTelegram(document);
  assert.equal(chunk.text, '😀 two words and ref');
  assert.ok(
    chunk.entities.some(
      (entity) => entity.type === 'text_link' && entity.offset === 3 && entity.url === 'https://example.com/a_(b)',
    ),
  );
  assert.ok(!chunk.text.includes(','));
});

test('local and unsafe links remain readable and cannot become clickable entities', async () => {
  const document = await fromMarkdown(
    '[local](<00 - Vault/file.md>) [bad](javascript:alert) ![photo](https://example.com/image.png)',
  );
  const [chunk] = assertTelegram(document);
  assert.ok(chunk.text.includes('local (00 - Vault/file.md)'));
  assert.ok(chunk.text.includes('bad (javascript:alert)'));
  assert.equal(chunk.entities.filter((entity) => entity.type === 'text_link').length, 1);
});

test('inline and fenced code retain exact punctuation and split into valid code entities', async () => {
  const document = await fromMarkdown('`a_b.c\\d`\n\n```js\n' + 'const x = `a_b`;\n'.repeat(400) + '```');
  const chunks = assertTelegram(document);
  assert.ok(visible(chunks).startsWith('a_b.c\\d\n'));
  assert.ok(
    chunks.flatMap((chunk) => chunk.entities).some((entity) => entity.type === 'pre' && entity.language === 'js'),
  );
});

test('unsupported MDAST nodes and raw HTML preserve readable content', () => {
  const document = fromMdast({
    type: 'root',
    children: [
      { type: 'future', children: [{ type: 'text', value: 'keep' }] },
      { type: 'html', value: '<b>literal HTML</b>' },
    ],
  });
  assert.equal(documentText(document), 'keep<b>literal HTML</b>');
});

test('Slate adapter uses the same entities renderer and code excludes nested marks', () => {
  const document = fromSlate(
    JSON.stringify([
      {
        type: 'paragraph',
        children: [
          { text: '*a_b*', bold: true, italic: true, underline: true },
          { text: 'code_\\', code: true, bold: true },
        ],
      },
      { type: 'unknown', children: [{ text: 'fallback!' }] },
    ]),
  );
  const [chunk] = assertTelegram(document);
  assert.equal(chunk.text, '*a_b*code_\\\nfallback!');
  assert.deepEqual(
    chunk.entities
      .filter((entity) => entity.offset === 0)
      .map((entity) => entity.type)
      .sort(),
    ['bold', 'italic', 'underline'],
  );
  assert.deepEqual(
    chunk.entities.filter((entity) => entity.offset === 5).map((entity) => entity.type),
    ['code'],
  );
  assert.throws(() => fromSlate('{}'));
});

test('incoming Telegram entities preserve hidden links and formatting for AI without changing raw text', () => {
  const text = '😀 bold link';
  const document = fromTelegram(text, [
    { type: 'bold', offset: 3, length: 4 },
    { type: 'text_link', offset: 8, length: 4, url: 'https://example.com' },
  ]);
  assert.equal(documentText(document), text);
  assert.equal(contextMarkdown(document), '😀 **bold** [link](https://example.com/)');
  assertTelegram(document, 8);
});

test('long links and many formatting runs preserve content and bound entity count', () => {
  const document = {
    runs: Array.from({ length: 500 }, (_, index) => ({
      text: `word${index}😀 `,
      marks: index % 2 ? { italic: true } : { bold: true, link: 'https://example.com' },
    })),
  };
  assert.ok(assertTelegram(document).length > 1);
});

test('Discord has its own bold, code, link, quote, escaped literals and mention-safe payload text', async () => {
  const document = await fromMarkdown('**bold** [**two** words](https://example.com/a_(b))\n\n> quote\n\n`a_b.c`');
  const rendered = renderDiscord(document).join('');
  assert.ok(rendered.includes('**bold**'));
  assert.ok(rendered.includes('> quote'));
  assert.ok(rendered.includes('`a_b.c`'));
  assert.ok(rendered.includes('https://example.com/a_%28b%29'));
  assert.equal(renderDiscord(await normalizeMessage(textMessage('*literal*')))[0], '\\*literal\\*');
});

test('Discord long bold and code chunks close wrappers and respect serialized 2000-char limit', () => {
  const bold = renderDiscord({ runs: [{ text: 'a'.repeat(6000), marks: { bold: true } }] });
  assert.ok(bold.every((chunk) => chunk.length <= 2000 && chunk.startsWith('**') && chunk.endsWith('**')));
  assert.equal(bold.map((chunk) => chunk.slice(2, -2)).join(''), 'a'.repeat(6000));
  const code = renderDiscord({ runs: [{ text: '😀'.repeat(2500), marks: { pre: true, language: 'js' } }] });
  assert.ok(code.every((chunk) => chunk.length <= 2000 && chunk.startsWith('```js\n') && chunk.endsWith('\n```')));
  assert.equal(code.map((chunk) => chunk.slice(6, -4)).join(''), '😀'.repeat(2500));
});

test('Discord handles oversized URL and literal fence without dropping content', () => {
  const link = 'https://example.com/' + 'a'.repeat(3000);
  assert.ok(renderDiscord({ runs: [{ text: 'label', marks: { link } }] }).every((chunk) => chunk.length <= 2000));
  assert.ok(
    renderDiscord({ runs: [{ text: 'a```b', marks: { pre: true } }] })
      .join('')
      .includes('a\\`\\`\\`b'),
  );
});

test('single builder handles migrated helpers and produces structured input for either transport', async () => {
  const inputs = [];
  const builder = new MessageBuilder({
    replyMessage: async (input) => {
      inputs.push(input);
      return [];
    },
  });
  builder.addHeader('*title*');
  builder.addLineRaw([builder.text('Amount: '), builder.bold('$1.00'), builder.text('.')]);
  builder.addFieldCode('Usage', '/test [id]');
  builder.addObject({ count: 3 });
  builder.addFieldReverse('name', 'score');
  await builder.reply();
  assert.equal(inputs.length, 1);
  const document = await normalizeMessage(inputs[0]);
  assert.ok(documentText(document).includes('*title*\nAmount: $1.00.\nUsage: /test [id]'));
  assertTelegram(document);
  assert.ok(renderDiscord(document).join('').includes('**$1.00**'));
});

test('entity parse fallback retries only the failed chunk, never delivered chunks', async () => {
  const calls = [];
  let failed = false;
  const results = await sendTelegram(
    documentMessage({ runs: [{ text: 'x'.repeat(9000), marks: { bold: true } }] }),
    async (payload) => {
      calls.push(payload);
      if (calls.length === 2 && !failed) {
        failed = true;
        throw { response: { error_code: 400, description: "Bad Request: can't parse entities" } };
      }
      return calls.length;
    },
  );
  assert.equal(results.length, 3);
  assert.equal(calls.length, 4);
  assert.equal(calls[1].text, calls[2].text);
  assert.equal(calls[2].entities.length, 0);
});

test('network, permission, rate-limit and unrelated 400 errors do not trigger a second send', async () => {
  for (const error of [
    new Error('timeout'),
    { response: { error_code: 403 } },
    { response: { error_code: 429 } },
    { response: { error_code: 400, description: 'chat not found' } },
  ]) {
    let calls = 0;
    await assert.rejects(() =>
      sendTelegram(markdownMessage('**text**'), async () => {
        calls++;
        throw error;
      }),
    );
    assert.equal(calls, 1);
  }
});

test('invalid limits and empty messages fail before transport calls', async () => {
  assert.throws(() => renderTelegram({ runs: [] }, 0));
  assert.throws(() => renderDiscord({ runs: [] }, 2));
  await assert.rejects(() => sendTelegram(textMessage('  '), async () => assert.fail('must not send')));
});

test('removing a command prefix keeps formatting ranges on the task or AI body', () => {
  const text = '/nexus bold link';
  const document = fromTelegram(text, [
    { type: 'bold', offset: 0, length: 11 },
    { type: 'text_link', offset: 12, length: 4, url: 'https://example.com' },
  ]);
  assert.equal(contextMarkdown(sliceDocument(document, 7)), '**bold** [link](https://example.com/)');
});

test('blockquote segments merge around inline styling and unknown-node trailing whitespace survives', async () => {
  const document = await fromMarkdown('> one **two** three');
  const [chunk] = assertTelegram(document);
  assert.equal(chunk.entities.filter((entity) => entity.type === 'blockquote').length, 1);
  assert.equal(chunk.entities.find((entity) => entity.type === 'blockquote').length, chunk.text.length);
  assert.equal(renderDiscord(document).join(''), '> one **two** three');
  assert.equal(documentText(fromMdast({ type: 'root', children: [{ type: 'future', value: 'kept\n' }] })), 'kept\n');
});
