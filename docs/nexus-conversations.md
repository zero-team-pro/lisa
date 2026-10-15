# Nexus conversations in Telegram

Implemented on the development branch; live Telegram acceptance is still required.
No OpenAI API calls or real AI runs are part of the automated checks.

## Interaction

- `/nexus <text>` creates an independent task from any mode.
- `/mode nexus` sends ordinary text messages to Nexus; `/mode exit` leaves it.
  Slash commands retain their own routing. Nexus remains Telegram-private-only.
- Replying to a **new Nexus completion message** explicitly continues its agent
  session, even outside Nexus mode. Replying to another message provides quoted
  context to a new task in Nexus mode or with `/nexus`.
- Ordinary messages always start new agent sessions. Each task snapshots up to
  ten recent text messages, at most 8,000 characters, from the same private chat
  in the preceding 24 hours. An explicitly quoted message can be older. Messages
  are references, not instructions to execute old requests again.
- There is no retroactive Telegram history import. Capture starts after this
  deployment. Attachments, voice transcription, edits, and reply-chain traversal
  are outside this change; text and captions are supported.
- The rolling buffer holds at most 50 text messages per owner, with expired rows
  removed on writes and every 15 minutes while the Telegram service runs.
  Task context snapshots remain in the existing durable task/audit retention.
  Account-link and other slash commands are excluded from incoming history;
  command responses other than AI/Nexus are excluded from ordinary reply capture.

Successful output contains the answer, a blank line, model and compact token
counts with execution duration on the token line. Cached tokens are a subset
of input tokens. Missing usage displays `—`, not zero. Exact measurements remain
in the database and task inspection API. UUIDs, acceptance and automatic retry
messages are hidden. Terminal failures give a concise actionable response;
raw worker diagnostics remain in task inspection/audit rather than Telegram.
The existing 4,000-character notification limit remains.

The final response replies to the original request. All Telegram chunk IDs and
IDs from repeated deliveries are retained for continuation routing. As before,
delivery is at least once; a crash between Telegram accepting a message and
persisting its ID can leave that particular message unmapped or cause a repeat.

## Typing

Only `sendChatAction('typing')` is used. The Telegram service restores pending
chat activity from PostgreSQL on startup and refreshes it every four seconds,
with one action per chat. It includes tasks waiting in the queue, execution,
automatic retries, and pending terminal deliveries. Each source record stops
contributing after 45 minutes, so an unavailable worker cannot leave an endless
indicator. A later request can start a new indicator. Telegram clears the status
when a response arrives; otherwise it expires after a few seconds.

Typing is best effort and does not prove that a worker has started. Queue lease,
retry, and callback recovery remain durable and independent of this indicator.
No message drafts, streaming, cancellation button, or new environment values.

## Sessions and compatibility

Migration `6_nexus_conversations` adds task interaction metadata, notification
reply/message IDs, and the short-lived chat buffer. Existing task rows and SQL
migration 5 are unchanged.

`POST /tasks/v1/claim` accepts the optional boolean `supportsConversations`.
Only workers passing `true` can claim tasks with interaction metadata. This
prevents older workers silently ignoring context or continuation. Responses add
nullable `interaction` with `sourceMessageId`, `conversationId`, `parentTaskId`,
and `context`. These fields are server-derived; create API bodies cannot supply
parent IDs, chat history, owners, or session IDs.

Lisa validates the current private `globalAdmin` on submission, context reads,
reply lookup, claim, callback and delivery. Conversation parents must be completed,
owned by the same chat, and have an authorized creator. Concurrent continuation
claims lock the conversation root and serialize leased work. A blocked oldest
continuation may delay other tasks until the next polling pass; the poller
already processes one task per pass.

The Nexus worker persists sessions only for new interaction-bearing tasks.
Existing tasks and other automations retain their ephemeral execution. Codex
uses explicit session IDs with `exec resume`, approval policy `never` and the
workspace-write sandbox; Claude uses explicit `--resume` with the existing
edit-only tool allowlist. Session IDs remain in private local queue records,
not in Telegram or HTTP task metadata. Callback recovery preserves them without
running AI again. There is no `--last` or fallback to an independent execution.
Missing local sessions or a changed provider produce an explicit failure.

Conversations are linear, not branches: replying to an older result of the same
conversation resumes that conversation's current agent session. Agent session
files consume disk and use the provider's local session retention. Old results
sent before this change lack message/session mappings and cannot resume an old
agent run. They can still be quoted as context for a new task.

## Development rollout and acceptance

1. Run `make check`. Apply migration 6 before starting updated gateway/Telegram.
2. Update the Nexus worker and shared AI dispatcher together. The reviewed
   vault changes (implementation, tests and project notes) are packaged in
   [`scripts/nexus-conversations.patch`](../scripts/nexus-conversations.patch),
   with original/result SHA-256 values in the adjacent manifest. Applying the patch
   changes sources read by the production LaunchAgent, so install it at an
   explicitly agreed rollout step. No credentials are in the patch. A dry-run
   must succeed against the current vault before applying it. The production
   LaunchAgent configuration and polling interval do not need changes. Before
   live dev tests, explicitly choose a dev worker credential/origin; do not
   repoint the production LaunchAgent implicitly.
3. In an authorized dev private chat, submit `/nexus`, enter `/mode nexus`, send
   two unrelated requests, and reply to a completion. Verify new sessions for
   unrelated requests and explicit resume for the reply.
4. Quote a warning notification and ask about it. Check recent-context bounds,
   formatted text, original-request replies, and compact metrics.
5. Cover queue wait, transient retries, terminal failure, worker offline,
   Telegram restart, unavailable session, and callback replay. No accepted/retry
   messages should appear; completion should not execute AI twice on replay.
6. Repeat negative cases with unlinked/regular users, groups, sender-chat updates,
   revoked roles, cross-owner message IDs and continuation parents. Entering a
   mode must never grant rights. Check zero new tasks/executions for denials.

### Isolated PostgreSQL regression

`bot/tests/nexus-conversations-db.test.mjs` checks v5→v6 upgrade/data preservation,
concurrent continuation claims, cross-owner and revoked-role denial, actual
notification-ID appends, and down/up behavior. It requires a disposable database
named `lisa_nexus_test` on `127.0.0.1`, compiled backend files, and no dotenv.
Run inside a Node 24.16 container sharing the **network-none** test PostgreSQL
container's network namespace, with only the backend mounted read-only. It
never runs `sync`, contacts Telegram, or invokes AI.

Known pre-existing bootstrap defect: migration 1 references
`enum_server_modules` without creating it. The upgrade fixture explicitly
creates that type (`ENUM ('core')`) before migrations 1–5. This is an existing
schema prerequisite, not a production migration step or a clean-bootstrap pass.
Keep its repair with the separately planned migration/sync investigation.

The Nexus worker regression uses a fake AI executable and a loopback fake Lisa
server. It covers persisted/resumed sessions, unavailable parents, callback
replay, retries and lease recovery without real AI calls.
