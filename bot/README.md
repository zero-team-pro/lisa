# Bot services

## Runtime

Use Node **24.16.0** (`nvm use` inside `bot`) and Yarn **4.17.1** through Corepack.
Install with `corepack yarn install --immutable`; run `make check` from the
repository root. Docker and backend CI use the same Node release.
See [backend dependency maintenance](../docs/backend-dependencies.md) for
compatibility decisions and development acceptance checks.

## Migrations

Schema changes require a numbered pair of SQL migrations in `src/migrations`:
`<number>_<name>.up.sql` and `<number>_<name>.down.sql`. Review the forward and
rollback SQL before deployment. The `migrate` Compose service runs pending
migrations before workers start; it is the schema deployment entry point.
Gateway startup authenticates the PostgreSQL connection and never calls
`sequelize.sync()`. Apply migrations before starting services, including when
running the gateway directly. `DB_FORCE` is no longer read; a leftover value in
an existing `.env` has no effect. Development database resets must be explicit,
limited to disposable development data, and followed by SQL migrations.

The initial migration creates `enum_server_modules` only if absent, including
all currently supported module labels. Existing types and their labels are
preserved. Already migrated instances do not rerun migration 1.
The legacy automatic generator and Sequelize CLI have been removed. Runtime
Sequelize remains the ORM; SQL migration deployment uses golang-migrate.
See [the migration review](../docs/sequelize-migrations-review.md) for the history
and SQL-only startup checks.

With Docker running and dependencies installed, run the isolated SQL regression
from the repository root with `./scripts/test-schema-migrations.sh`. It uses
locally available PostgreSQL 17.2, migrate 4.18.1 and Node 24.16.0 images, disables
external networking, checks fresh/upgrade schemas and removes its test container.
It never loads the repository `.env`, starts production services, or runs AI.

```bash
# From the repository root, using an already configured development environment
make dev-up
```

Migration `5_nexus_tasks` adds the durable Nexus task queue and attempt/lease
history, execution metadata, request audit, and a durable Telegram notification outbox. Deploy it through the
existing `migrate` service before starting a gateway or Telegram worker built
with the task-queue code. The rollback drops request audit, notifications, then attempt history,
then tasks; rolling back deletes all queued and terminal task records, so export
any required audit data before doing so.

The gateway sweeps expired task leases and delivers pending status notifications
every 30 seconds. `NOTIFY_TOKENS` must also be configured on the Telegram service:
`/nexus` only accepts tasks from chats accessible to a configured worker token
and senders linked to an `AdminUser` with role `globalAdmin`, in their own private
chat. Every task API operation and result delivery also verifies the private
owner’s current globalAdmin role. Group chats cannot use the task queue.
See [the task API deployment handoff](../docs/nexus-task-api.md#deployment-and-integration-handoff)
for migration ordering and smoke-test scenarios.

Nexus mode, chat context, explicit reply continuations, and development rollout:
[docs/nexus-conversations.md](../docs/nexus-conversations.md).
