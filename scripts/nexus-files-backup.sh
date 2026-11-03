#!/usr/bin/env bash
# Run as root from the Lisa checkout after gracefully stopping the Mac worker.
# Usage: sudo bash scripts/nexus-files-backup.sh FILE_STORE_ROOT BACKUP_PARENT
set -euo pipefail
umask 077
[[ $EUID == 0 ]] || { echo 'Run as root to preserve private file ownership.' >&2; exit 1; }
[[ $# == 2 ]] || { echo 'Expected file-store root and backup parent.' >&2; exit 1; }
store=$(realpath -e -- "$1")
parent=$(realpath -e -- "$2")
[[ -d $store/staging && -d $store/blobs ]] || { echo 'Invalid file store.' >&2; exit 1; }
[[ $parent != "$store" && $parent != "$store/"* ]] || { echo 'Backup destination must be outside file store.' >&2; exit 1; }
# Refuse to consume the root filesystem's recovery headroom. No pruning of
# existing backup sets is implicit in this operation.
required=$(du -sb "$store" | cut -f1)
available=$(df --output=avail -B1 "$parent" | tail -1 | tr -d ' ')
(( available > required + 6000000000 )) || { echo 'Insufficient backup capacity; preserve at least 6GB free.' >&2; exit 1; }
exec 9>/run/lock/lisa-nexus-backup.lock
flock -n 9 || { echo 'Backup already running.' >&2; exit 1; }
set_id="$(date -u +%Y%m%dT%H%M%SZ)-$(cat /proc/sys/kernel/random/uuid)"
partial="$parent/.$set_id.partial"
final="$parent/$set_id"
mkdir -m 700 "$partial"
# Stop intake, file mutations, notification sends and designated cleanup. Compose
# waits for active transfers; application SIGTERM must stop accepting new work.
docker compose stop --timeout 150 gateway telegram
resume() { docker compose start gateway telegram >&2; }
trap resume EXIT
active=$(docker compose exec -T db sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1' <<'SQL'
SELECT count(*) FROM public.nexus_task WHERE status = 'leased' AND "leaseExpiresAt" > now();
SQL
)
[[ $active == 0 ]] || { echo 'Active lease: let execution finish and stop the worker first.' >&2; exit 1; }

# All filesystem mutation services are now stopped: capture both halves while
# paused, including staged uploads and pending delivery artifacts.
docker compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$partial/database.dump"
tar --numeric-owner -cpf "$partial/nexus-files.tar" -C "$store" .
printf 'backup_set_id=%s\ncreated_utc=%s\n' "$set_id" "$(date -u +%FT%TZ)" > "$partial/manifest.txt"
(cd "$partial" && sha256sum database.dump nexus-files.tar manifest.txt > SHA256SUMS)
sync -f "$partial/database.dump"
sync -f "$partial/nexus-files.tar"
sync -f "$partial"
mv -- "$partial" "$final"
sync -f "$parent"
printf 'Paired backup captured: %s\n' "$final"
