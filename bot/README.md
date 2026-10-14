# Bot services

## Migrations

When you create or modify models, you need to create and run migrations.

```bash
# Compile TypeScript to JavaScript
yarn build

# Generate migrations
yarn db:makemigrations --name [name]

# Check and edit new migration if necessary

# Start at least gateway service and PostgreSQL to run migrations
docker compose up -d --build
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
