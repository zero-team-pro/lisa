#!/usr/bin/env bash
# Run only in a temporary code-only checkout. No production mounts or env.
set -euo pipefail
umask 077
backend=$(cd "$(dirname "$0")/../bot" && pwd)
run_id="$$-$(date +%s)"
seed_db="lisa-restore-seed-db-$run_id"
restored_db="lisa-restore-target-db-$run_id"
seed_runner="lisa-restore-seed-$run_id"
verify_runner="lisa-restore-verify-$run_id"
image="${LISA_FILES_TEST_IMAGE:-ghcr.io/zero-team-pro/lisa-bot:21}"
db_image="${LISA_FILES_DB_IMAGE:-ghcr.io/zero-team-pro/lisa-db:21}"
checkpoint=$(mktemp -d /tmp/lisa-paired-restore.XXXXXXXX)
cleanup() { docker rm -f "$seed_runner" "$verify_runner" "$seed_db" "$restored_db" >/dev/null 2>&1 || true; rm -rf -- "$checkpoint"; }
trap cleanup EXIT
start_db() {
 docker run --pull=never --name "$1" --network none -e POSTGRES_USER=nexus_test -e POSTGRES_PASSWORD=nexus_test_only -e POSTGRES_DB=lisa_nexus_test -d "$db_image" postgres >/dev/null
 for attempt in {1..40}; do
  if docker exec "$1" pg_isready -h 127.0.0.1 -U nexus_test -d lisa_nexus_test >/dev/null 2>&1; then return; fi
  sleep 0.25
 done
 return 1
}
create_runner() {
 docker create --name "$1" --network "container:$2" -w /app -e POSTGRES_HOST=127.0.0.1 -e POSTGRES_DB=lisa_nexus_test -e POSTGRES_USER=nexus_test -e POSTGRES_PASSWORD=nexus_test_only -e STAGING=prod -e NEXUS_FILES_ROOT=/tmp/nexus-file-restore --entrypoint node "$image" --import ./src/preloader.mjs tests/nexus-files-restore.mjs "$3" >/dev/null
 docker cp "$backend/dist/." "$1:/app/dist"
 docker cp "$backend/src/." "$1:/app/src"
 docker cp "$backend/tests/." "$1:/app/tests"
}
start_db "$seed_db"
for migration_file in "$backend"/src/migrations/{1,2,3,4,5,6,7,8}_*.up.sql; do
 docker exec -e PGPASSWORD=nexus_test_only -i "$seed_db" psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U nexus_test -d lisa_nexus_test < "$migration_file" >/dev/null
done
create_runner "$seed_runner" "$seed_db" seed
docker start -a "$seed_runner"
[[ $(docker inspect --format '{{.State.ExitCode}}' "$seed_runner") == 0 ]]
# The seed process has exited: metadata and file mutations are paused together.
docker exec -e PGPASSWORD=nexus_test_only "$seed_db" pg_dump -h 127.0.0.1 -U nexus_test -d lisa_nexus_test --format=custom > "$checkpoint/database.dump"
docker cp "$seed_runner:/tmp/nexus-file-restore" "$checkpoint/store"
tar --numeric-owner -cpf "$checkpoint/nexus-files.tar" -C "$checkpoint" store
printf 'backup_set_id=%s\n' "$run_id" > "$checkpoint/manifest.txt"
(cd "$checkpoint" && sha256sum database.dump nexus-files.tar manifest.txt > SHA256SUMS && sha256sum -c SHA256SUMS)
start_db "$restored_db"
docker exec -e PGPASSWORD=nexus_test_only -i "$restored_db" pg_restore -h 127.0.0.1 -U nexus_test -d lisa_nexus_test --exit-on-error --no-owner < "$checkpoint/database.dump"
mkdir "$checkpoint/extracted"
tar --numeric-owner -xpf "$checkpoint/nexus-files.tar" -C "$checkpoint/extracted"
create_runner "$verify_runner" "$restored_db" verify
docker cp "$checkpoint/extracted/store" "$verify_runner:/tmp/nexus-file-restore"
docker start -a "$verify_runner"
[[ $(docker inspect --format '{{.State.ExitCode}}' "$verify_runner") == 0 ]]
printf 'PAIRED_RESTORE_PASSED\n'
