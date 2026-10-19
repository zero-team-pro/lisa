# Private Nexus TikTok Capture

## Behavior and boundary

`tiktok-capture-v1` adds a deterministic private capture route to the existing
Nexus task queue. It never launches a model to classify or download a link.
Media and Obsidian cards are written by the Mac worker, not by Lisa.

Entry is only `/nexus <payload>` or a message in the sender's active `/mode nexus`.
Require the same linked `globalAdmin`, configured worker chat, own private chat,
matching current sender/chat and no group/channel/sender-chat as ordinary Nexus.
Role/mode alone does not grant vault access. API callers retain existing owner-
scoped bearer authorization; this release adds no user/token/chat grants.

After stripping `/nexus`, a payload whose first non-empty line consists of one
supported HTTPS TikTok video URL is capture. Optional following text becomes the
owner note, retaining internal whitespace. Raw Telegram URL/text_link entities
use UTF-16 offsets; captions and forwarded links use the same current-sender
checks. A URL embedded in a question remains an ordinary Nexus task. Other slash
commands keep their own semantics. A tracked reply outside Nexus mode does not
become capture; capture has no AI context or continuation parent.

Examples:

```text
/nexus https://vt.tiktok.com/EXAMPLE/

Туториал по скилам
```

```text
https://vt.tiktok.com/EXAMPLE/
```

The second example requires active Nexus mode. Photo posts and multi-URL capture
candidates are rejected with a short error, never passed to AI. A hidden link's
actual target is validated. Capture intake is automatic after the normal Lisa
release/migration; no feature flag or extra activation step is required.

Acceptance, progress, success, duplicate save and automatic retries are silent:
no reply, typing, reaction or model/token footer. Capture input is not copied
into ordinary AI conversation history. Internal callbacks/audit still reconcile
all tasks. Only intake failure or terminal failure creates a notice. If the Mac
reported a retained card, the notice names its five-digit ID; otherwise it says
that the link's Nexus state is unconfirmed (important after an abandoned lease).
There is no success notice after recovery from an earlier error.

## Compatible /tasks/v1 contract

Existing routes and mandatory fields remain. Migration 7 adds nullable JSONB:
`nexus_task.operation`, `nexus_task.capture`, `nexus_task_attempt.capture`.
Legacy rows are null; generic task execution is unchanged.

Optional create `operation` (also returned by create, claim and owner GET):

```json
{
  "kind": "tiktok.capture",
  "version": 1,
  "routingVersion": 1,
  "url": "https://vt.tiktok.com/EXAMPLE/",
  "note": "Optional owner note"
}
```

Exact keys only. URL is at most 2048 UTF-16 code units; note at most 8000. Require
HTTPS, no userinfo/custom port, and exact hosts `tiktok.com`, `www.tiktok.com`,
`m.tiktok.com`, `vt.tiktok.com`, `vm.tiktok.com`. Canonical paths are
`/@author/video/<numeric ID>`; short hosts accept one non-empty short-code segment.
Unknown versions/kinds/keys fail validation. Required task `text` retains the
10,000-character limit; Telegram capture sets `TikTok capture: <url>`.
Missing/null operation keeps legacy generic behavior. API/service both validate.

Telegram `clientRequestId` remains `telegram:<unique message identity>`. Repeated
owner/key/text/normalized operation returns the same task; changed note or URL
conflicts with `409`. Normalize JSONB object order before comparing. Capture
retains only minimal `interaction.sourceMessageId` delivery metadata with empty
context and null parent; it cannot be used as an AI continuation parent.

Claim request adds optional unique `supportedOperations` (at most 16 names):

```json
{
  "workerId": "nexus-mac",
  "leaseSeconds": 2700,
  "supportsConversations": true,
  "supportedOperations": ["tiktok.capture.v1"]
}
```

Missing/empty capabilities select only operation-null tasks. A capable worker
selects generic tasks and matching kind/version/routingVersion, still under the
existing owner/conversation/due-time/atomic lease rules. Unknown capability names
are rejected. Unsupported persisted operation versions stay queued, never
silently become general AI tasks. Old workers remain safe after rollout/rollback.

Result adds optional `capture`, persisted on task/attempt and exposed by GET:

```json
{
  "libraryId": "00001",
  "state": "saved",
  "reasonCode": null
}
```

Exact keys only. `libraryId` is null or `00001`–`99999`; no filesystem paths.
Completed capture requires local provider, saved/existing state, non-null ID and
null reason. Retry/failed uses link_only plus ID, or none plus null ID, with a
reason: network, timeout, busy, login_required, unsupported, unavailable,
size_limit, invalid_media, dependency_missing, configuration or internal.
Only network/timeout/busy can retry. Capture requires non-null result metadata,
`provider: local`, and no AI execution metadata. Generic tasks cannot submit
capture metadata. Existing outcome/summary/error/retry-time rules still apply.
The task UUID and library ID are different identities.

Capture is part of the callback fingerprint; exact duplicate callbacks create
no extra error notification. Generic fingerprints without capture keep their
legacy shape. Acceptance/retry/success create no capture notification. Terminal
errors are inserted transactionally into the existing outbox, including lease
exhaustion. Outbox transport recovery is separate from import execution; do not
promise exactly-once Telegram transport under ambiguous delivery failures.

Three total claims and 45-minute leases are unchanged. Mac enforces a 15-minute
capture deadline and resumes unfinished work using the durable library registry.
No automatic model escalation. Silence does not imply successful iCloud sync.

## Rollout and rollback

1. Install the compatible Mac worker that advertises `tiktok.capture.v1`. It
   remains compatible with the old Lisa API and ordinary tasks.
2. Release Lisa normally with migration 7. Private Nexus capture starts
   automatically; no environment change or new credentials are needed. Until a
   compatible Mac worker is available, capture jobs wait in the durable queue;
   an old worker cannot send them to AI.
3. Share one TikTok in permanent Nexus mode and verify the saved card/video,
   silence on success/duplicates and zero AI usage.

The user owns push/release. This change does not deploy Lisa; its normal release enables private capture.

Rollback: retain operation-aware server filtering while rolling back the Mac
worker; incoming capture jobs may wait in the queue. Before database down migration, drain or explicitly
cancel all queued/leased capture operations; archive any metadata that must be
kept. Migration 7 down refuses to erase operation types while capture work is
queued/leased. Dropping the schema loses capture metadata on terminal rows and
requires a deliberate owner-operated rollback, not routine worker rollback.
Do not disable validation or make old workers consume operation tasks.

## Verification

```bash
cd bot
yarn verify
```

Shared JSON routing fixtures: `src/services/nexusTaskRouting.fixtures.json`.
Tests cover private intake, Unicode URL entities, capability filtering, typed
results/idempotency, silence/typing and existing generic behavior. No paid
provider or real Telegram calls are used.

`tests/nexus-capture-db.test.mjs` requires disposable `lisa_nexus_test` PostgreSQL
on loopback, migrations 1–6 already applied, and current compiled backend. The
test applies 7 and proves upgrade preservation, actual SQL JSONB/capability
filtering, concurrent claims, no success/retry outbox, terminal error/replay,
lease exhaustion, ownership/revocation, generic behavior and guarded down/up.
Run only against a disposable database; it creates fixture users/tasks and
rolls the capture schema down/up. It never loads dotenv or calls sync, AI or
Telegram. A reproducible Docker procedure is in `tests/run-nexus-capture-db.sh`.

The human-editable policy lives in Nexus `Projects/Lisa/Nexus Task Routing.md`;
[PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) identifies the vault. Agents apply
policy changes to the necessary validated code/configuration and shared fixtures;
editing the Markdown alone does not change live routing.

## Download and reply extension — 2026-10-19

Owner-approved behavior: `скачай`, `пришли`, `download`, `send` select a temporary
download and video-only reply. Normalize the entire non-URL text by removing
whitespace and lowercasing. Ordinary notes do not match by substring. Codes may
appear before/after a single URL, on the same or later lines. Nexus private
entry/owner checks and no-AI dispatch remain mandatory.

New operation: `{kind: "tiktok.send", version: 1, routingVersion: 1, url, note: ""}`.
The note must be empty. Existing queued capture operations keep their meaning.
No new database migration: migration 7 JSONB operation/capture fields support
this additive operation. Send creation requires the original Telegram message
interaction and rejects API-created send jobs without it.

Capability: `tiktok.send.v1`. To remain compatible with capture-only deployed
Lisa, the Mac sends it in the new optional `optionalSupportedOperations` claim
field, while `supportedOperations` retains `tiktok.capture.v1`. Updated Lisa
validates/merges both lists; older Lisa ignores the optional field and continues
serving capture/general jobs. Capture-only workers cannot claim send jobs.

`GET /tasks/v1/:id/video` checks owner, creator, current attempt and unexpired
lease; it returns `{state: "none" | "sending" | "sent"}`. `POST` at the same URL
accepts a raw `video/mp4` body, up to 49,000,000 bytes. Both require the existing
bearer token plus `x-nexus-lease` and `x-nexus-attempt` headers. No caller-supplied
chat ID, caption, filename, external media URL or filesystem path is accepted.
Gateway passes bounded media through the private Telegram bridge; the sending
process repeats authorization/lease checks and derives chat/reply target from
the task. The bot uses `sendVideo` with `reply_parameters` and no caption or text.

The Mac uses a separate bounded downloader subprocess (15-minute deadline,
process-group termination), validates media with the existing transport and
removes temporary files in a finally block. It never calls `importVideo`, opens
the registry or writes a library card/attachment. Send downloads select MP4 and
apply the Telegram upload ceiling; oversized/unavailable sources fail without
silently switching to library capture or AI.

Before external delivery the Telegram process durably reserves `capture` state
`sending` with null library ID/reason. Confirmed delivery persists `sent` before
acknowledgement. A completed send callback requires local provider, no AI data,
`{libraryId: null, state: "sent", reasonCode: null}` and server confirmation.
Send failures use state `none`, null library ID and the existing reason codes.
The reservation is retained across failed/interrupted callbacks and retries.

Before downloading, the Mac queries delivery state. Confirmed sends reuse the
receipt without downloading/uploading again. A network-lost acknowledgement can
therefore reconcile on retry. `sending` or an uncertain Telegram outcome is
terminal and is never automatically resent: Telegram has no transactional send
idempotency key. A crash between external send and confirmation can require a
manual resubmission; do not promise exactly-once delivery. Success remains video
only, including when a later queue failure occurs after a confirmed send.

Operational requirements: the reverse proxy must allow at least 50 MB request
bodies and 210-second upstream timeouts for `/tasks/v1/:id/video`; the application
still enforces its lower 49,000,000-byte limit. RabbitMQ must allow the base64
bridge envelope (about 66 MB). Video bytes and lease credentials are omitted
from bridge debug logs. No new credentials or AI providers are needed.

Status: local implementation; Lisa release and a real owner-message pilot are
pending. No production release or real Telegram send was performed in this work.
