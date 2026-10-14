# Message formatting

Implementation prepared on 2026-10-15. Local checks pass; live dev-server
acceptance is pending. Production has not been changed by this refactor.

## One document, explicit inputs, transport-specific output

```text
Plain text ───────────────┐
Markdown → remark + GFM ─┤
MessageBuilder → MDAST ──┼→ MessageDocument (text runs + semantic marks)
CMS Slate JSON ──────────┤       ├→ Telegram: text + native entities, ≤4096 UTF-16 units
Telegram text + entities ┘       ├→ Discord: escaped Discord Markdown, ≤2000 serialized units
                                └→ semantic Markdown for AI/task context
```

`BaseMessage` still owns transport identity; `TelegramMessage` and
`DiscordMessage` implement their respective send paths. Their common method is
`replyMessage(MessageInput)`, with explicit `text`, `markdown`, `mdast` or
`document` inputs. `reply(string)` remains a plain-text convenience. There is
no boolean that changes the meaning of a string and no pre-rendered MarkdownV2
input to the common interface.

## Ownership

| Component                                            | Responsibility                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `bot/src/messages/document.ts`                       | Input types, document runs, semantic marks, UTF-16 boundaries, safe links, slicing                |
| `bot/src/messages/sources.ts`                        | Markdown/MDAST, Slate and incoming Telegram adapters                                              |
| `bot/src/messages/telegram.ts`                       | Native entities, independent entity offsets per chunk, bounded entity count, chunk-local fallback |
| `bot/src/messages/discord.ts`                        | Discord syntax, serialized-length splitting, AI context serialization                             |
| `bot/src/controllers/messageBuilder.ts`              | The single programmatic MDAST builder; returns explicit input, never transport markup             |
| `bot/src/controllers/{telegram,discord}/*Message.ts` | Dispatch, actual transport calls and message identities                                           |
| `bot/src/services/nexusTaskNotifications.ts`         | Nexus message wording, durable event snapshot and explicit Markdown opt-in                        |

Markdown uses `remark-parse` plus `remark-gfm`. Lists, task lists, strikethrough,
reference links, images as labeled links, quotes and readable table rows are
supported. Raw HTML is displayed literally rather than executed. Unsupported
AST structures retain their text instead of emitting `undefinedProcessor`.
Only supported absolute links become clickable; local/relative paths and unsafe
schemes remain visible text. A code/pre run excludes other formatting marks.

Telegram receives plain text plus native entities, with UTF-16 offsets and
surrogate-safe splitting. It no longer receives MarkdownV2. An explicit
entity-parse rejection may retry only that rejected chunk as plain text.
Network errors, permission errors, rate limits and unrelated `400` errors do
not trigger an immediate second send. Already delivered chunks are not replayed
by this fallback. This does not promise exactly-once network delivery.

Discord receives its own Markdown, never Telegram markers. Wrappers close in
each chunk and the serialized payload determines its size. Generated mentions
are disabled on adapter replies. Literal triple fences in code and pathological
link lengths degrade to escaped readable text when needed.

## Call sites and input behavior

- Existing command callers now use the same `getMessageBuilder()`; the legacy
  string builder and `getMessageBuilderOld()` have been removed.
- Ordinary AI answers use `replyMessage(markdownMessage(answer))`. The previous
  whole-answer fallback, which could duplicate successful earlier chunks, has
  been removed.
- CMS keeps its existing Slate JSON persistence and browser editor. `fromSlate`
  adapts it into the same document; titles are bold text, not raw interpolated
  markup. Long articles may produce multiple messages; the existing API keeps
  returning the first message ID.
- Giveaway structured notifications use the same Telegram renderer.
- `/notify/v1` remains plain text; existing punctuation retains its meaning.
  The internal `tg-notify` bridge can explicitly opt into Markdown, and Nexus
  delivery does so. This adds no HTTP request field or route.
- Telegram `content` stays raw text/caption for command recognition and audit.
  `getAIContent(start)` converts entities into semantic Markdown and slices off
  command prefixes before serialization. AI prompts, reply-parent history and
  Nexus task submission use this path, preserving hidden links and code.
- Discord incoming content retains its source syntax. Existing Discord parent
  lookup and attachment TODOs are outside this text-formatting change.

The old `cookMarkdown`, `processMarkdown`, `slateToTelegramMDV2`, general
Telegram escape helper and broken string splitters have been removed. Slate and
`remark-stringify` are no longer bot runtime dependencies; the admin editor
retains its own Slate dependencies. Parser/renderer info-level body dumps were
removed with the old paths; this is not a repository-wide logging audit.

## Limits

This is semantic normalization, not byte-for-byte Markdown round-trip storage.
Heading depth, table layout and exact source whitespace are not a portable chat
contract. Telegram underline, spoiler and expandable-quote distinctions may
have simplified representations in AI Markdown. Files, reactions, custom emoji
and messenger-specific interactive UI are outside this document model.

Nexus notification wording, diagnostic footer and the existing 4,000-unit
snapshot truncation remain in the notification service. Broader presentation
changes belong to the separately planned message-presentation work. The
renderer does not change authentication, ownership checks, queue states or
retry policy.

## Verification

From `bot/`, use the pinned Node version:

```bash
nvm use
yarn verify
```

`test:unit` and `test:ci` include `test:messages`, which builds the code and
runs Node integration tests against the real ESM Markdown parser, adapters and
renderers. Jest transport tests use mocked transport APIs; neither suite sends
messages, invokes AI or connects to a database. Coverage includes prior word
loss, long code/bold/link chunks, nested styles, Unicode offsets, Slate, hidden
incoming links, safe link degradation, fallback/no-replay behavior and actual
Telegram/Discord class dispatch. Development acceptance is described in
[message-formatting-dev-check.md](message-formatting-dev-check.md).

Reference contracts: [Telegram entities](https://core.telegram.org/bots/api#messageentity)
and [Discord messages](https://docs.discord.com/developers/resources/message).
