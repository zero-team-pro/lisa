# Nexus task API (`mvp-v1`)

Status: frozen core with compatible optional execution metadata and task inspection
approved on 2026-10-14 and pre-release security restrictions approved on
2026-10-15. This domain has not been released; no supported v1 client is removed. Lisa is the durable remote source of truth for the
Telegram↔Lisa↔Nexus task queue. Nexus pulls tasks; Lisa does not connect to the
Nexus Mac. There is no unversioned `/tasks` API fallback.

## Authentication and ownership

Every endpoint requires `Authorization: Bearer <token>`. Tokens are configured
with the existing `NOTIFY_TOKENS=token:chatId,...` mapping. The mapped Telegram
chat owns every task created or claimed with that token; request bodies cannot
override the chat. Every task operation additionally resolves this positive
private-chat ID through `TelegramUser.adminId` and requires the current linked
`AdminUser.role` to be exactly `globalAdmin`. Missing links, revoked roles, and
group/channel chat IDs return `403`, even with a configured notification token.
Role lookup errors fail closed. Machine tokens are privileged credentials for
that administrator; they must never be shared with untrusted clients. Missing or invalid tokens return `401`. Looking up a task
owned by another chat returns `404`, exactly like a missing task. Multiple
tokens mapped to the same chat intentionally share that chat’s queue.

Task text is limited to 10,000 characters. `clientRequestId` is limited to 200
characters. Telegram result messages are plain text, include the task ID, and
are truncated safely to 4,000 characters.

## Create

`POST /tasks/v1`

```json
{
  "text": "Task instruction",
  "clientRequestId": "optional-idempotency-key"
}
```

The bearer token determines the owner. API creation sets `source: "api"`;
`/nexus <task text>` calls the same service with `source: "telegram"`. A new
task returns `201`:

```json
{
  "task": {
    "id": "task-uuid",
    "text": "Task instruction",
    "source": "api",
    "status": "queued",
    "attemptCount": 0,
    "maxAttempts": 3,
    "availableAt": "2026-07-17T10:00:00.000Z",
    "createdAt": "2026-07-17T10:00:00.000Z",
    "updatedAt": "2026-07-17T10:00:00.000Z"
  }
}
```

`clientRequestId` is unique per owner. Repeating the same ID and text returns
the existing task with `200`; repeating the ID with different text returns
`409`. Malformed input returns `400`.

## Claim

`POST /tasks/v1/claim`

```json
{
  "workerId": "nexus-mac",
  "leaseSeconds": 2700
}
```

`leaseSeconds` may be omitted, in which case Lisa applies 2,700 seconds. Any
other value returns `400`. Lisa atomically locks and selects the oldest due
`queued` task owned by the token, changes it to `leased`, and increments
`attemptCount`. Concurrent claimers skip locked rows. An active lease cannot be
claimed again; an expired lease is requeued unless its three attempts are
exhausted. No available task returns `204`.

```json
{
  "task": {
    "id": "task-uuid",
    "text": "Task instruction",
    "source": "telegram",
    "status": "leased",
    "attempt": 1,
    "maxAttempts": 3,
    "leaseToken": "opaque-lease-token",
    "leaseExpiresAt": "2026-07-17T10:45:00.000Z",
    "createdAt": "2026-07-17T10:00:00.000Z"
  }
}
```

Lisa stores only a SHA-256 hash of the opaque lease token. The fixed 45-minute
lease is longer than Nexus's fixed 30-minute AI timeout, leaving callback time.

## Report result

`POST /tasks/v1/:id/result`

```json
{
  "leaseToken": "opaque-lease-token",
  "outcome": "completed",
  "attempt": 1,
  "provider": "codex",
  "summary": "Human-readable final response",
  "error": null,
  "retryable": false,
  "retryAt": null
}
```

Allowed outcomes and required fields:

- `completed`: non-empty `summary`, `error: null`, `retryable: false`, and
  `retryAt: null`.
- `failed`: non-empty `error`, `retryable: false`, and `retryAt: null`.
- `retry`: non-empty `error`, `retryable: true`, and a future ISO `retryAt`.

A retry changes the same task back to `queued` at `retryAt`. If the current
claim is attempt three, it becomes permanently `failed`. A valid result returns
`200`:

```json
{
  "task": {
    "id": "task-uuid",
    "status": "completed",
    "attemptCount": 1,
    "availableAt": null,
    "updatedAt": "2026-07-17T10:20:00.000Z"
  }
}
```

The same task, lease, attempt, and payload is idempotent and returns `200`
without another Telegram message. A conflicting repeat returns `409`.
Malformed payloads return `400`; missing or cross-owner tasks return `404`; a
wrong, expired, inactive, or superseded lease or mismatched attempt returns
`409`. An identical callback already accepted before lease expiry remains
idempotent after expiry if no newer attempt was claimed. This includes a retry
callback whose `retryAt` has since passed: duplicate detection precedes the
future-time check. A new retry with a past `retryAt` returns `400`. An accepted
callback from a superseded attempt returns `409`. Malformed task UUIDs return
`404` without querying PostgreSQL.

## Optional execution metadata

`POST /tasks/v1/:id/result` accepts an optional `execution` object (or `null`).
Old clients can omit it. The same callback must repeat the same metadata;
changing metadata on an accepted callback returns `409`.

```json
{
  "execution": {
    "model": "gpt-6.1-sol",
    "reasoningEffort": "medium",
    "inputTokens": 1200,
    "cachedInputTokens": 900,
    "outputTokens": 80,
    "reasoningOutputTokens": 30,
    "durationMs": 12345,
    "reusedFromAttempt": null
  }
}
```

All properties are optional/nullable. Counts and duration are non-negative safe
integers. Cached input is included in input tokens; reasoning output is included
in output tokens. Do not add these subsets again when calculating totals.
Unavailable measurements stay `null`, including when a process is killed before
reporting usage. Duration covers the AI subprocess, not queue or callback time.
Metadata is reported by the authenticated worker, not independently metered by
Lisa. Codex uses explicit model/reasoning settings and JSONL usage events;
Claude uses JSON result/model/usage metadata. Other automation callers retain
their existing plain-text output mode.

Each attempt keeps its execution metadata. When Nexus reuses a completed local
result after a later claim, it preserves its original provider/model/usage and
sets `reusedFromAttempt` to the original execution attempt. It never runs AI or
recomputes metrics just to retry a callback. Local history keeps metadata from
previous attempts.

`GET /tasks/v1/:id` returns `{ "task": ... }` with the create-response fields,
`createdBy`, `resultSummary`, `lastError`, `completedAt`, `attempts`, and `usage`.
Each attempt includes `attempt`, `workerId`, `provider`, `outcome`, `execution`,
and `resultReceivedAt`; lease secrets/hashes are excluded. Missing, invalid, or
cross-owner IDs return `404`; invalid auth returns `401`.

`usage` contains `inputTokens`, `cachedInputTokens`, `outputTokens`,
`reasoningOutputTokens`, and `durationMs`, summed across distinct executions.
Reused executions count once. A total stays `null` if any included execution
lacks that measurement, rather than silently reporting a partial total.
Telegram results/retries include the current execution's model, input/cached/
output tokens and duration, even when the result text needs truncation.

## Requester and request audit

`nexus_task.createdBy` records the original Telegram user ID and linked
`AdminUser` ID, or the authenticated API token's SHA-256 fingerprint. The owner
chat remains the routing/isolation boundary; callers cannot override the actor
in a body. An API token identifies a credential, not the person holding it.
Different tokens for the same chat remain distinguishable in the audit.
The API audit also records the currently resolved `AdminUser` ID. Creation is
checked again in the shared service. Claims reject older draft tasks with no
verified creator, and delivery checks the private owner’s current role before
sending any task content to Telegram.

`nexus_task_request` records each create/claim/result/inspection request and
Telegram `/nexus` submission, including denied/invalid submissions and malformed
API JSON. Entries contain time, operation, owner chat when known, actor,
whitelisted request fields, task linkage and response status. Unauthenticated
requests record operation/task metadata rather than the untrusted body. String
fields are bounded: task text at 10,000 characters, other request fields at
4,000, execution strings at 100. Bearer tokens,
lease tokens and arbitrary headers/body fields are excluded. Audit payloads
contain task text/results and belong in the database, not ordinary logs.
An invalid API token has no authenticated actor fingerprint.

The request entry is persisted before the operation runs. If that write fails,
the operation fails closed. HTTP completion status is updated after response
finish; `null` can indicate an interrupted request or a failed completion write.
Per gateway process, the task API limits each authenticated credential to 120
requests/minute and all unauthenticated requests together to 30/minute. Excess
requests return `429` with `Retry-After: 60` before any audit/database writes;
throttled requests do not create individual audit entries. These bounds also
cover malformed JSON. Audit records have no task foreign key, so denied/missing-task requests and
historical evidence survive task deletion. There is no automatic cleanup.

Example investigation (replace the placeholder with a Telegram user ID):

<!-- prettier-ignore -->
```sql
SELECT "createdAt", "operation", "responseStatus", "taskId", "payload"
FROM public.nexus_task_request
WHERE "actor"->>'telegramUserId' = '<telegram-user-id>'
ORDER BY "createdAt" DESC;
```

## State, retry, and retention

```text
queued -> leased -> completed
                 -> failed
                 -> queued (future retry on the same task ID)
```

Claims, including recovery after lease expiry, increment `attemptCount`.
`completed` and `failed` are terminal and never claimable. The maximum is three
attempts. Nexus owns the frozen retry classification and delays of 1, 5, and 20
minutes plus small jitter; Lisa enforces the supplied future `retryAt` and the
attempt bound. Three total attempts mean one initial execution and at most two
execution retries; a third retry delay (20 minutes) is never used with this
limit. Attempt numbers advance only on Lisa claims, not on result callbacks.
Callback retries reuse an already-computed result and must not
execute AI again. The MVP performs no automatic retention cleanup.

## Telegram behavior

`/nexus <task text>` (also `/nexus@BotName <task text>`) durably creates the task before replying with an
acknowledgement and task ID. Lisa sends concise task-ID-bearing updates for API
acceptance, completion, permanent failure, and scheduled retry. Duplicate
result callbacks do not enqueue duplicate status messages.

Telegram submission is allowed only in the sender’s private chat. Group,
channel, anonymous/sender-chat and mismatched sender/chat contexts are rejected.
It requires a sender linked through `TelegramUser.adminId` to
an `AdminUser` whose role is exactly `globalAdmin`. The sender is resolved from
the Telegram update, never from task text. Unlinked users and other roles are
denied. The private chat must also be present in `NOTIFY_TOKENS`. API operations
require both the bearer token and the linked private owner’s current
`globalAdmin` role. The audit records the linked AdminUser ID, but a machine
credential still does not prove which person possessed it.

API acceptance and every retry/terminal transition write a separate notification
snapshot to PostgreSQL in the same transaction as the task state. The gateway
checks expired leases and drains up to 20 notifications every 30 seconds,
including on startup. Delivery failures retry independently of Nexus callbacks
(after at least one minute); an interrupted delivery claim becomes eligible
again after five minutes. Lease recovery also works when Nexus is offline and
emits a retry or exhausted-attempt notification. Telegram submission replies
immediately after durable creation.

Delivery is at least once: normal duplicate callbacks and concurrent delivery
claims do not create extra messages, but a crash after Telegram accepts a message
and before Lisa records delivery can cause a repeat. Telegram offers no
transaction shared with PostgreSQL; strict exactly-once delivery is not promised.
Task, attempt, and notification records have no automatic retention cleanup.

## Deployment and integration handoff

No new environment variable is required. The configured chat must be the
positive private Telegram user ID of a linked `globalAdmin`; a group mapping
is insufficient for task access (and remains usable for ordinary notifications). Configure the existing `NOTIFY_TOKENS`
on the gateway and Telegram service, run the Telegram service and its AMQP
bridge, and give the Nexus worker its matching bearer token. The worker uses
`/tasks/v1` on the same API origin as `/notify/v1`.

Before starting the new gateway/Telegram image, apply migration `5_nexus_tasks`
using the existing `migrate` service and verify its successful exit. Compose
now waits for PostgreSQL TCP readiness, then successful migration completion
before starting the gateway, Telegram and other database consumers.
The migration creates tasks, attempts (with execution metadata), pending Telegram
notifications, and a request audit log. Tasks retain the original server-derived
requester in `createdBy`.
Rollback drops notifications, attempts, then tasks and deletes their records.
This migration is edited as an unreleased migration; if an earlier draft was
already applied anywhere, that database needs a separate forward migration.

Smoke-test with a dedicated configured chat: create a task with a request ID,
repeat it, claim it, report a completed result, and repeat that callback. Check
`201/200/200/200/200`, one attempt, one accepted notification, and one completion
notification. Then cover a retry, expiry, exhaustion, and ownership isolation.
Do not enable AI polling until this check passes against the target database.

Before enabling the Nexus poller, first verify negative production cases without
AI execution: no token (`401`), invalid token (`401`), a token mapped to an
unlinked/regular user (`403`), a group token (`403`), and `/nexus` from an
unlinked/regular user or any group (`403`/denial message). These requests must
create no tasks or attempts. Then use the globalAdmin's private chat for the
create/claim/result smoke test above. Keep polling disabled during these checks.

The linked AdminUser can be verified without exposing credentials:

```sql
SELECT
  t.id AS "telegramUserId",
  t."adminId",
  a.role
FROM
  public.telegram_user AS t
  JOIN public.admin_user AS a ON a.id = t."adminId"
WHERE
  t.id = '<private-telegram-user-id>';
```

Telegram webhook and account-link secrets are generated with 32 cryptographic
random bytes. `/linkMe` is private-chat-only and atomically consumes its
single-use Redis token. Generic Telegram logs redact `/linkMe` and `/nexus`
contents; malformed JSON bodies are excluded from gateway error logs.
`DB_FORCE` is destructive and enables forced ORM recreation only for the exact
value `true`; leave it unset during a production release.
