#!/usr/bin/env bash
# Disposable PostgreSQL + migration runner + Node test client, without external networking.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
container_name="lisa-schema-test-$$"
container_owned=0
cleanup() {
  if [[ "$container_owned" == 1 ]]; then
    docker rm --force "$container_name" >/dev/null
  fi
}
trap cleanup EXIT

(cd "$repo_root/bot" && corepack yarn build)
docker run --pull never --detach --name "$container_name" --network none \
  --env POSTGRES_PASSWORD=isolated-schema-test --env POSTGRES_DB=lisa_schema_test \
  --mount "type=bind,src=$repo_root/bot/src/migrations,dst=/migrations,readonly" \
  postgres:17.2-alpine >/dev/null
container_owned=1
for ((attempt = 0; attempt < 30; attempt++)); do
  if docker exec "$container_name" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container_name" pg_isready -h 127.0.0.1 -U postgres >/dev/null

migrate_database() {
  local database_name="$1"
  shift
  docker run --pull never --rm --network "container:$container_name" \
    --mount "type=bind,src=$repo_root/bot/src/migrations,dst=/migrations,readonly" \
    migrate/migrate:v4.18.1 -path /migrations \
    -database "postgres://postgres:isolated-schema-test@127.0.0.1:5432/$database_name?sslmode=disable" "$@"
}
run_regression() {
  docker run --pull never --rm --network "container:$container_name" \
    --mount "type=bind,src=$repo_root/bot,dst=/workspace/bot,readonly" \
    --workdir /workspace/bot --env "POSTGRES_DB=$1" --env POSTGRES_USER=postgres \
    --env POSTGRES_PASSWORD=isolated-schema-test --env POSTGRES_HOST=127.0.0.1 \
    node:24.16.0-bookworm-slim node --import ./src/preloader.mjs --test "$2"
}

# Empty database: no enum, model sync, or manually seeded schema.
migrate_database lisa_schema_test up
run_regression lisa_schema_test tests/schema-migrations-db.test.mjs

# Existing type + v5 data: the historical enum label and rows must survive.
docker exec "$container_name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c 'CREATE DATABASE lisa_schema_upgrade_test;' -c 'CREATE DATABASE lisa_nexus_test;'
docker exec "$container_name" psql -U postgres -d lisa_schema_upgrade_test -v ON_ERROR_STOP=1 \
  -c "CREATE TYPE public.enum_server_modules AS ENUM ('core', 'rater', 'cms', 'discord', 'telegram', 'shop', 'mastercard', 'listener', 'rating', 'openai', 'vm', 'giveaway', 'openai-tools', 'historical-module');"
migrate_database lisa_schema_upgrade_test up 5
docker exec "$container_name" psql -U postgres -d lisa_schema_upgrade_test -v ON_ERROR_STOP=1 \
  -c "INSERT INTO server (id, prefix, modules, \"createdAt\", \"updatedAt\") VALUES ('existing-server', '!', ARRAY['core', 'historical-module']::public.enum_server_modules[], now(), now()); INSERT INTO nexus_task (id, \"ownerChatId\", text, source, status, \"createdAt\", \"updatedAt\") VALUES ('00000000-0000-4000-8000-000000000001', 999, 'existing task', 'api', 'completed', now(), now());"
migrate_database lisa_schema_upgrade_test up
migrate_database lisa_schema_upgrade_test up # Must report no change.
run_regression lisa_schema_upgrade_test tests/schema-migrations-db.test.mjs

# Existing conversation regression now needs no manually supplied enum either.
migrate_database lisa_nexus_test up 5
run_regression lisa_nexus_test tests/nexus-conversations-db.test.mjs
