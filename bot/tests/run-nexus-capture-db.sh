#!/usr/bin/env bash
# Disposable Docker-only DB test. No published ports, production env or outbound network.
set -euo pipefail
backend=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
run_id="$$-$(date +%s)"
db_container="lisa-capture-db-$run_id"
runner_container="lisa-capture-runner-$run_id"
image="${LISA_CAPTURE_TEST_IMAGE:-ghcr.io/zero-team-pro/lisa-bot:latest}"
cleanup() {
  docker rm -f "$runner_container" "$db_container" >/dev/null 2>&1 || true
}
trap cleanup EXIT
if [[ ! -f "$backend/dist/services/nexusTaskRouting.js" ]]; then
  echo 'Build the current backend first: cd bot && yarn build' >&2
  exit 1
fi
docker image inspect "$image" >/dev/null
docker run --pull=never --name "$db_container" --network none \
  -e POSTGRES_USER=nexus_test -e POSTGRES_PASSWORD=nexus_test_only \
  -e POSTGRES_DB=lisa_nexus_test -d postgres:17.2-alpine >/dev/null
ready=false
for attempt in {1..40}; do
  if docker exec "$db_container" pg_isready -U nexus_test -d lisa_nexus_test >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 0.25
done
if [[ "$ready" != true ]]; then
  docker logs "$db_container" >&2
  exit 1
fi
for migration_file in "$backend"/src/migrations/{1,2,3,4,5,6}_*.up.sql; do
  docker exec -i "$db_container" psql -v ON_ERROR_STOP=1 -U nexus_test -d lisa_nexus_test < "$migration_file" >/dev/null
done
docker create --name "$runner_container" --network "container:$db_container" -w /app \
  -e POSTGRES_HOST=127.0.0.1 -e POSTGRES_DB=lisa_nexus_test \
  -e POSTGRES_USER=nexus_test -e POSTGRES_PASSWORD=nexus_test_only -e STAGING=prod \
  --entrypoint node "$image" --import ./src/preloader.mjs --test tests/nexus-capture-db.test.mjs >/dev/null
# Copy only compiled/source/test files; never copy .env or mount the user's repo.
docker cp "$backend/dist/." "$runner_container:/app/dist"
docker cp "$backend/src/." "$runner_container:/app/src"
docker cp "$backend/tests/." "$runner_container:/app/tests"
docker start -a "$runner_container"
test "$(docker inspect --format '{{.State.ExitCode}}' "$runner_container")" = 0
