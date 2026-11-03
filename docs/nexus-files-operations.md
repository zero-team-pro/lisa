# Nexus file operations

See [file contract](nexus-files.md). File support must be released with the
matching Mac worker; do not clear queue/recovery records during deployment.

## Host evidence (2026-11-03)

Production `DATA_MOUNT_PATH` is `/mnt/lisa/data`, on `/dev/sdb`, a separate
10,726,932,480-byte filesystem. PostgreSQL uses its `postgres/` subdirectory.
Observed available space before rollout: 10,382,626,816 bytes. The file store
belongs at `/mnt/lisa/data/nexus-files/`; `/opt/lisa` does not exist on this host.

The nominal 10 GB file quota does not override the free-space reserve. The
5 GB reserve is larger than 10% of this volume, so available file capacity is
initially below 5.4 GB and shrinks as PostgreSQL grows. Never lower this reserve
to make an upload pass. Place backups on the root filesystem or a verified
external backup destination, not on the PostgreSQL volume.

Before changing runtime UID, verify the application, certificates and .env
remain readable. Provision the actual shared application UID/GID with store
directories 0700 and files 0600. Gateway and Telegram must mount the same
path; no other service needs the binary payload mount. Verify both container
identities and mounts after restart. Do not grant world access.

## Paired backup

`bash scripts/nexus-files-backup.sh STORE_ROOT BACKUP_PARENT` runs as root from
the deployment checkout. First gracefully stop the Mac worker after its current
execution finishes. Do not restart it until backup completes. The script stops gateway and Telegram (including cleanup), refuses active
leases after intake is paused, captures one
PostgreSQL custom dump and one numeric-owner filesystem tar, writes a shared
backup-set ID and checksums, synchronizes both, then resumes the services.
A failed backup leaves a `.partial` directory, never a successful backup set.

Example destination on this host: `/home/ubuntu/backups/lisa-nexus`, mode 0700.
Create and verify capacity before use. A backup on the same host provides
restore evidence but is not an off-host disaster-recovery copy. Preserve the
existing external host backup policy separately.

The packaged systemd timer schedules a paired backup daily at **04:00 UTC
(08:00 Asia/Tbilisi)**. Install and enable it only after the first paired backup
and isolated restore pass. `Persistent=false` avoids surprise catch-up downtime.
The gateway pause prevents new claims; an existing lease makes the script resume
services and refuse the snapshot rather than interrupting an execution. The
persistent Mac worker backs off during the brief API maintenance window.

Check `systemctl status nexus-files-backup.service` and the latest completed
backup-set timestamp. A timer alone does not establish successful coverage.
The script refuses a backup when less than the store size plus 6GB remains at
the destination. It does not delete older sets automatically: archive verified
sets off-host and explicitly manage retention before this capacity guard trips.
A failed service or missing daily backup requires operator action.

## Isolated restore verification

1. Keep production services and data untouched. Create an isolated PostgreSQL
   container with no published ports, and a fresh private file-store directory.
2. Verify `sha256sum -c SHA256SUMS` in a completed backup set. Extract
   `nexus-files.tar` into the isolated directory as root with numeric ownership.
3. Restore `database.dump` with `pg_restore --exit-on-error --no-owner` into the
   isolated database. Use the isolated container's database user.
4. Point only the test runner at that database and store. Reconcile staged
   publications and interrupted deletion, check every ready blob's size/hash,
   and verify pending task/delivery references retain bytes. Do not enable the
   production worker, Telegram delivery or public claims against this restore.
5. Remove only the named isolated test resources after recording verification.

A matching database/filesystem pair is mandatory. Independent dumps, arbitrary
filesystem copies or empty-volume startup do not establish recoverability.
