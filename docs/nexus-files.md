# Nexus files

## Contract

The additive file contract stays under `/tasks/v1`. The canonical transport limits and example manifest are `bot/src/services/nexusFiles.fixtures.json`; the Nexus worker carries an identical copy. Input/output limits are 10 files, 20,000,000 bytes per file and 50,000,000 bytes per group. History has its own 10-file/50 MB budget. Transfers time out after 120 seconds; the store admits two simultaneous uploads.

Every create/claim/inspection response exposes an `attachments` array. Entries contain `id`, `name`, `mimeType`, `sizeBytes`, `sha256`, `provenance`, `sourceMessageId`, `availability`. Paths, provider credentials, Telegram URLs and file bodies never belong in this manifest. Names are bounded display metadata; storage keys use server UUIDs. Input provenance is `current|quoted|history`; finalized output uses `generated`. Expired or metadata-only history is reference metadata, never visible content.

All operations authenticate a configured notify bearer and require its linked private globalAdmin owner. The token alone determines ownership. File download and artifact upload additionally require the task's active `X-Nexus-Lease` and positive `X-Nexus-Attempt`. The verified task creator, association and owner are rechecked. Missing/foreign IDs return 404, inactive leases 409, unavailable associated bytes 410, malformed metadata 400, oversized requests 413, unsupported transport content type 415, concurrent saturation 429, unavailable/corrupt storage 503, and quota/free-space exhaustion 507. Authorization happens before raw byte intake.

### Machine staging

`POST /tasks/v1/files` accepts streamed `application/octet-stream`. Headers:

- `X-Nexus-Filename`: percent-encoded display filename (200 characters maximum, no separators or controls).
- `X-Nexus-Mime-Type`: declared MIME. This is a hint, never proof of type.
- `X-Nexus-Sha256`: optional lowercase SHA-256 integrity expectation.
- `Content-Length`: optional; when present it must be bounded. The actual stream is independently bounded.

The response is `{ "file": <manifest> }` only after durable file publication and metadata commit. Create accepts `attachmentIds` referring to ready same-owner files. If files are present and text is empty, the fixed descriptive fallback instruction is used. Missing/foreign/unavailable IDs abort the entire task transaction. Files are associated before a task becomes claimable. Task/file associations are immutable after intake.

### Worker input

`GET /tasks/v1/:taskId/files/:fileId` serves original bytes as `application/octet-stream` with safe attachment disposition, `nosniff` and `no-store`. A SHA-256/size verification occurs before bytes leave the store. The worker independently verifies the stream, stages it in private OS temporary storage, and sends images through the provider's real image mechanism. Embedded instructions and recent history are untrusted source material.

### Worker output

`POST /tasks/v1/:taskId/artifacts/:artifactId` uses the staging headers and active lease headers. The worker generates a stable UUID before upload. Identical retries at that ID reuse the same accepted metadata; changed bytes/name/MIME/task return 409. Artifact IDs are bound to their uploading task. Result callback `artifacts` is the canonical ordered array of uploaded IDs; only a completed result can finalize artifacts. Ordered immutable metadata participates in result fingerprints. Repeating an accepted callback adds no association or notification.

The worker must durably persist its AI result and local artifact cache before upload/callback. A callback or upload outage recovers without repeating AI. Output discovery uses only an explicit bounded manifest in a private output directory; symlinks, traversal, directories and arbitrary vault scanning are rejected.

## Storage lifecycle

Migration 8 adds metadata-only file/blob/task/history/album/delivery tables. PostgreSQL contains no payload columns. Compose mounts `${DATA_MOUNT_PATH}/nexus-files/` at `/var/lib/lisa/nexus-files` in gateway and Telegram only. Both run as UID/GID 1000. Provision root/directories 0700 and files 0600 before deployment; `NEXUS_FILES_ROOT` overrides the path in isolated tests.

Quota reservations use a shared database advisory lock and do not hold a transaction during network transfer. The aggregate quota is 10 GB including outstanding uploads; unbound ready/staged bytes are limited to 500 MB per owner. The physical reserve is the greater of 5 GB and 10% of filesystem capacity. The actual mount may share storage with PostgreSQL; see [deployment and paired backups](nexus-files-operations.md).

Files stream into exclusive staging paths, are hashed/bounded, fsynced and atomically renamed on the same filesystem. Directory entries are fsynced before publication commits. Owner/hash/size deduplication locks and verifies an existing winner; no cross-owner content reuse occurs. Abandoned uploads are marked failed and retained/accounted until orphan grace permits deletion. After a restart, a row without a committed ready file never becomes a successful task input automatically.

The gateway runs the designated lifecycle loop. Active/retry tasks and undelivered notifications pin their referenced ready blobs. Other associated bytes expire 30 days after the last terminal task; unbound/orphan staging gets a 24-hour grace period. Cleanup transitions eligible blobs to `deleting` under the same locking used by bindings/read reservations, unlinks idempotently, then expires metadata and releases accounting. Interrupted deletion retries. Audit/task metadata survives.

PNG/JPEG/GIF/WebP dimensions are bounded before analysis; unknown claimed image formats become octet-stream rather than trusted images. Archives and executable content are never automatically run or extracted. Audio/video transport does not imply transcription or frame analysis.

## Delivery and monitoring

The existing notification worker owns both final text and ordered Telegram documents. Delivery rows persist `pending|sending|sent|uncertain`, with Telegram message IDs. An uncertain external send is never automatically repeated; the owner retry-delivery action explicitly acknowledges possible duplication and never reruns execution. Current private globalAdmin ownership is checked again at delivery.

`GET /tasks/v1/files/health` is authenticated and reports accounted quota bytes, free-space reserve, cleanup state, pending notifications and uncertain sends without host paths. Storage quota at 80%, approaching the free-space reserve, uncertainty and maintenance failures are actionable. Gateway maintenance writes sanitized error/warning logs. Task inspection includes `delivery` separately from task execution status.

## Verification and coordinated rollout

Run `cd bot && yarn verify`, then `bash tests/run-nexus-files-db.sh` with disposable Docker images. The isolated runner never loads production `.env`, publishes ports, contacts Telegram or invokes paid AI. Override `LISA_FILES_TEST_IMAGE` and `LISA_FILES_DB_IMAGE` for pinned locally available images. `tests/nexus-files-restore.mjs seed|verify` proves paired database/filesystem restore with pending output and abandoned staging.

Deploy migration and both application sides as one release; preserve queues, attempts, recovery caches and pending deliveries. Stop the worker gracefully, verify the actual storage and paired backup, deploy migration/application, install the matching worker, run authenticated byte-level smoke checks, then perform real screenshot, album, PDF, continuation and generated-document acceptance. Fixture verification alone is not production acceptance. Roll back both applications together if required, retaining additive metadata and stored bytes; migration 8 intentionally refuses destructive automatic rollback.
