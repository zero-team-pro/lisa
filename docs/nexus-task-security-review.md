# Nexus task queue security review — 2026-10-15

Scope: the unreleased Lisa task API, Telegram submission and account linking,
worker result handling, notification delivery, and release migration ordering.
The Nexus worker and compatible telemetry additions were also checked with
fake-provider/local API tests; no production requests or AI executions were run.

## Findings addressed

- The draft task HTTP API accepted any configured notification token without
  checking `AdminUser`. Every operation now requires a private Telegram identity
  linked to a current `globalAdmin`; this is checked again by business services.
  `NOTIFY_TOKENS` remains a credential store, not a role grant.
- Group task results could expose vault data to non-admin members. Submission,
  token owners and notification delivery are private-chat-only. The actual
  Telegram sender must equal the private chat ID; anonymous/sender-chat updates
  and ordinary roles are rejected.
- Creator metadata alone could not establish authorization for older draft
  records. New creation requires a verified creator. Claim rejects tasks with
  missing/mismatched creator identity before generating a lease or attempt.
- Telegram webhook/account-link secrets used `Math.random()`. They now use
  32 cryptographic random bytes. Account linking consumes its Redis proof with
  atomic `GETDEL`, runs only in private chats, and cannot consume one proof
  twice in concurrent requests. Generic logs redact linking tokens and task
  instructions. Forged webhook updates without the secret fail Telegraf's
  authenticated webhook filter before command dispatch.
- Unauthenticated requests could grow the request audit without a bound.
  Per-process credential/unauthenticated rate limits run before audit writes;
  invalid-token bodies are discarded and retained string fields are bounded.
- Compose startup did not wait for completed migrations. PostgreSQL TCP health
  gates the migration, and successful migration completion gates consumers.
  `DB_FORCE=false` no longer means forced database recreation; only `true` does.

## Security boundaries verified

Automated checks exercise missing/wrong bearer tokens, missing AdminUser links,
regular/admin roles, revoked roles, database lookup failures, forged body actor
fields, shared/anonymous Telegram contexts, wrong private senders, direct
service calls without verified creators, cross-owner task access, old creatorless
queue records, invalid/superseded leases, duplicate callbacks and metrics,
notification delivery after loss of authorization, webhook forgery, and
concurrent reuse of account-link proofs. Denied paths must not create tasks,
leases or attempts, or send task content.

Task APIs use bound Sequelize parameters and owner-scoped queries. Response
mappers do not expose lease hashes, bearer tokens or arbitrary model internals.
Unknown usage stays unknown and callback replay does not double-count execution.

## Production handoff

The first deployment still needs live PostgreSQL migration and concurrency
verification. Local unit/router tests and ORM loading do not replace that check.
Keep Nexus polling disabled until the negative authorization checks in
[nexus-task-api.md](nexus-task-api.md#deployment-and-integration-handoff) pass,
then run the authorized create/claim/result check without AI.

Only configure task tokens for the private Telegram identity of a linked
`globalAdmin`. A valid token is a privileged machine credential acting for that
administrator; someone possessing it is indistinguishable from the worker.
Neither this review nor the role check protects a stolen Telegram/bot/worker
credential. No general permission framework or new automatic role grant exists.

The role is checked for each new operation and before notification delivery.
Revoking it blocks subsequent requests; it does not retroactively terminate an
AI subprocess already authorized and started on the Nexus host.

No commit push, release, production migration, poller activation or privileged
production action was performed during this review.
