import { Logger } from '@/controllers/logger';
import { readFileSync, constants, fsyncSync } from 'node:fs';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { QueryTypes, Transaction } from 'sequelize';
import { NexusTask, sequelize } from '@/models';
import { isAuthorizedTaskCreator, requireNexusTaskOwner, NexusTaskForbiddenError } from './nexusTaskAuthorization';

// Lisa is launched from the backend root (/app in Compose); the source fixture ships in the image.
export const NEXUS_FILE_LIMITS: Readonly<{
  count: number;
  bytes: number;
  total: number;
  store: number;
  staging: number;
  timeoutMs: number;
  stagingMs: number;
  concurrency: number;
}> = Object.freeze(JSON.parse(readFileSync(path.resolve('src/services/nexusFiles.fixtures.json'), 'utf8')).limits);
export const NEXUS_FILE_DEFAULT_TEXT = 'Определи, что находится во вложенных файлах, и кратко опиши содержимое.';
export const isFileUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export class NexusFileError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface NexusFileManifest {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  provenance: 'current' | 'quoted' | 'history' | 'generated';
  sourceMessageId: number | null;
  availability: 'ready' | 'expired' | 'metadata-only';
}
export interface NexusInputFile {
  id: string;
  provenance: 'current' | 'quoted' | 'history';
  sourceMessageId: number | null;
  availability?: 'ready' | 'expired' | 'metadata-only';
}
export interface NexusFileUpload {
  ownerChatId: string;
  name: string;
  declaredMime: string;
  source: 'api' | 'telegram' | 'generated';
  telegramFileId?: string;
  telegramUniqueId?: string;
  fileId?: string;
  taskId?: string;
  attempt?: number;
  leaseToken?: string;
  expectedSha256?: string;
}
interface FileRow {
  id: string;
  ownerChatId: string;
  blobId: string;
  name: string;
  declaredMime: string;
  mimeType: string;
  sizeBytes: string | number;
  sha256: string;
  state: string;
  source: string;
  expiresAt: Date;
  uploadTaskId: string | null;
  uploadAttempt: number | null;
  storageKey: string;
  blobState: string;
  provenance?: NexusFileManifest['provenance'];
  sourceMessageId?: number;
  bound?: boolean;
  ordinal?: number;
  availability?: NexusFileManifest['availability'];
}
const query = <T extends object>(sql: string, replacements: Record<string, unknown> = {}, transaction?: Transaction) =>
  sequelize.query<T>(sql, { replacements, transaction, type: QueryTypes.SELECT });
const mutate = (sql: string, replacements: Record<string, unknown> = {}, transaction?: Transaction) =>
  sequelize.query(sql, { replacements, transaction });
const fileRoot = () => path.resolve(process.env.NEXUS_FILES_ROOT || '/var/lib/lisa/nexus-files');
const error = (status: number, message: string): never => {
  throw new NexusFileError(status, message);
};
const lock = (transaction: Transaction) => query('SELECT pg_advisory_xact_lock(74621942)', {}, transaction);
const toManifest = (row: FileRow): NexusFileManifest => ({
  id: row.id,
  name: row.name,
  mimeType: row.mimeType,
  sizeBytes: Number(row.sizeBytes),
  sha256: row.sha256,
  provenance: row.provenance || (row.source === 'generated' ? 'generated' : 'current'),
  sourceMessageId: row.sourceMessageId || null,
  availability:
    row.availability && row.availability !== 'ready'
      ? row.availability
      : row.state === 'ready' && (!row.blobState || row.blobState === 'ready')
        ? 'ready'
        : 'expired',
});

export function validateFileMetadata(name: unknown, mime: unknown) {
  if (typeof name !== 'string' || !name || name.length > 200 || /[\x00-\x1f\x7f/\\]/.test(name))
    error(400, 'Invalid file display name');
  if (typeof mime !== 'string' || mime.length > 200 || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(mime))
    error(400, 'Invalid MIME type');
}
export function validateFileIds(value: unknown): string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.length > NEXUS_FILE_LIMITS.count ||
    value.some((id) => !isFileUuid(id)) ||
    new Set(value).size !== value.length
  )
    error(400, 'Expected at most 10 unique file IDs');
  return value as string[];
}
async function safePath(key: string, createParents = false) {
  if (!/^(staging\/[0-9a-f-]+|blobs\/[0-9]+\/[0-9a-f-]+)$/.test(key)) error(500, 'Invalid storage key');
  const root = fileRoot();
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const rootStat = await fs.lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || rootStat.mode & 0o077)
    error(503, 'File store permissions require maintenance');
  let current = root;
  for (const component of key.split('/').slice(0, -1)) {
    current = path.join(current, component);
    if (createParents)
      await fs.mkdir(current, { mode: 0o700 }).catch((cause) => {
        if (cause.code !== 'EEXIST') throw cause;
      });
    const stat = await fs.lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.mode & 0o077) error(503, 'Unsafe file store directory');
  }
  const full = path.join(root, key);
  const existing = await fs.lstat(full).catch((cause) => {
    if (cause.code === 'ENOENT') return null;
    throw cause;
  });
  if (existing && (!existing.isFile() || existing.isSymbolicLink() || existing.mode & 0o077))
    error(503, 'Unsafe stored file');
  return full;
}
async function freeSpace(required: number) {
  const stat = await fs.statfs(fileRoot());
  const capacity = stat.blocks * stat.bsize;
  const free = stat.bavail * stat.bsize;
  if (free - required < Math.max(5_000_000_000, capacity * 0.1)) error(507, 'File storage free-space reserve reached');
}
function detectMime(prefix: Buffer, declared: string) {
  if (prefix.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (prefix.length < 24) error(400, 'Invalid PNG');
    const width = prefix.readUInt32BE(16),
      height = prefix.readUInt32BE(20);
    if (!width || !height || width * height > 100_000_000) error(413, 'Image dimensions exceed limits');
    return 'image/png';
  }
  if (prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255) {
    let offset = 2;
    while (offset + 4 <= prefix.length) {
      if (prefix[offset] !== 255) error(400, 'Invalid JPEG');
      const marker = prefix[offset + 1];
      if (marker === 255) {
        offset++;
        continue;
      }
      if ([0xd8, 0xd9, 0x01].includes(marker)) {
        offset += 2;
        continue;
      }
      const length = prefix.readUInt16BE(offset + 2);
      if (length < 2) error(400, 'Invalid JPEG');
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (offset + 9 > prefix.length) error(400, 'Invalid JPEG dimensions');
        const height = prefix.readUInt16BE(offset + 5),
          width = prefix.readUInt16BE(offset + 7);
        if (!width || !height || width * height > 100_000_000) error(413, 'Image dimensions exceed limits');
        return 'image/jpeg';
      }
      offset += length + 2;
    }
    error(400, 'JPEG dimensions could not be verified');
  }
  if (prefix.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (['GIF87a', 'GIF89a'].includes(prefix.subarray(0, 6).toString())) {
    if (prefix.length < 10 || prefix.readUInt16LE(6) * prefix.readUInt16LE(8) > 100_000_000)
      error(413, 'Image dimensions exceed limits');
    return 'image/gif';
  }
  if (prefix.subarray(0, 4).toString() === 'RIFF' && prefix.subarray(8, 12).toString() === 'WEBP') {
    const kind = prefix.subarray(12, 16).toString();
    let width = 0,
      height = 0;
    if (kind === 'VP8X' && prefix.length >= 30) {
      width = 1 + prefix.readUIntLE(24, 3);
      height = 1 + prefix.readUIntLE(27, 3);
    }
    if (kind === 'VP8 ' && prefix.length >= 30 && prefix.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
      width = prefix.readUInt16LE(26) & 0x3fff;
      height = prefix.readUInt16LE(28) & 0x3fff;
    }
    if (kind === 'VP8L' && prefix.length >= 25 && prefix[20] === 0x2f) {
      const bits = prefix.readUInt32LE(21);
      width = (bits & 0x3fff) + 1;
      height = ((bits >>> 14) & 0x3fff) + 1;
    }
    if (!width || !height) error(400, 'WebP dimensions could not be verified');
    if (width * height > 100_000_000) error(413, 'Image dimensions exceed limits');
    return 'image/webp';
  }
  if (prefix.subarray(4, 8).toString() === 'ftyp') return 'video/mp4';
  if (prefix.subarray(0, 4).toString() === 'OggS') return 'audio/ogg';
  // Never bless a claimed image without recognizing its signature.
  if (declared.startsWith('image/')) return 'application/octet-stream';
  if (declared.startsWith('text/') || ['application/json', 'application/csv'].includes(declared)) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(prefix, { stream: true });
      return declared;
    } catch {
      return 'application/octet-stream';
    }
  }
  return 'application/octet-stream';
}

async function readVerifiedBytes(key: string, size: number, hash: string) {
  const handle = await fs.open(await safePath(key), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size !== size || size > NEXUS_FILE_LIMITS.bytes)
      error(503, 'Stored file integrity failure');
    const bytes = await handle.readFile();
    if (bytes.length !== size || createHash('sha256').update(bytes).digest('hex') !== hash)
      error(503, 'Stored file integrity failure');
    return bytes;
  } finally {
    await handle.close();
  }
}

export async function requireFileLease(
  input: { ownerChatId: string; taskId: string; leaseToken: string; attempt: number },
  transaction?: Transaction,
) {
  if (!isFileUuid(input.taskId)) error(404, 'Task not found');
  const admin = await requireNexusTaskOwner(input.ownerChatId);
  const task = await NexusTask.findOne({
    where: { id: input.taskId, ownerChatId: input.ownerChatId },
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!task) error(404, 'Task not found');
  if (!isAuthorizedTaskCreator(task.createdBy, input.ownerChatId, admin.id)) throw new NexusTaskForbiddenError();
  const hash = createHash('sha256').update(input.leaseToken).digest('hex');
  if (
    task.operation ||
    task.status !== 'leased' ||
    task.attemptCount !== input.attempt ||
    !task.leaseExpiresAt ||
    task.leaseExpiresAt.getTime() <= Date.now() ||
    !task.leaseTokenHash ||
    task.leaseTokenHash.length !== hash.length ||
    !timingSafeEqual(Buffer.from(task.leaseTokenHash), Buffer.from(hash))
  )
    error(409, 'Inactive file lease');
  return task;
}

export async function stageNexusFile(
  input: NexusFileUpload,
  stream: AsyncIterable<Uint8Array>,
): Promise<NexusFileManifest> {
  await requireNexusTaskOwner(input.ownerChatId);
  validateFileMetadata(input.name, input.declaredMime);
  if (
    !/^\d+$/.test(input.ownerChatId) ||
    (input.fileId && !isFileUuid(input.fileId)) ||
    (input.expectedSha256 && !/^[0-9a-f]{64}$/.test(input.expectedSha256))
  )
    error(400, 'Invalid file identity');
  const id = input.fileId || randomUUID(),
    blobId = randomUUID();
  const stagingKey = `staging/${blobId}`,
    storageKey = `blobs/${input.ownerChatId}/${blobId}`;
  const staging = await safePath(stagingKey, true);
  await safePath(storageKey, true);
  await sequelize.transaction(async (transaction) => {
    await lock(transaction);

    const [usage] = await query<{ total: string; owner: string; active: string; pending: string }>(
      `SELECT COALESCE(SUM(b."reservedBytes"),0) total, COALESCE(SUM(b."reservedBytes") FILTER (WHERE b."ownerChatId"=:owner AND (b.state='staging' OR NOT EXISTS(SELECT 1 FROM nexus_file f JOIN nexus_task_file r ON r."fileId"=f.id WHERE f."blobId"=b.id))),0) owner, COUNT(*) FILTER (WHERE b.state='staging' AND b."createdAt">now()-interval '120 seconds') active, COALESCE(SUM(b."reservedBytes") FILTER (WHERE b.state='staging'),0) pending FROM nexus_file_blob b WHERE b.state IN ('staging','ready','deleting','failed')`,
      { owner: input.ownerChatId },
      transaction,
    );
    await freeSpace(Number(usage.pending) + NEXUS_FILE_LIMITS.bytes);
    if (
      Number(usage.total) + NEXUS_FILE_LIMITS.bytes > NEXUS_FILE_LIMITS.store ||
      Number(usage.owner) + NEXUS_FILE_LIMITS.bytes > NEXUS_FILE_LIMITS.staging
    )
      error(507, 'File storage quota reached');
    if (Number(usage.active) >= NEXUS_FILE_LIMITS.concurrency) error(429, 'File upload concurrency reached');
    await mutate(
      `INSERT INTO nexus_file_blob(id,"ownerChatId","storageKey",state) VALUES (:blobId,:owner,:storageKey,'staging')`,
      { blobId, owner: input.ownerChatId, storageKey },
      transaction,
    );
  });
  let size = 0,
    prefix = Buffer.alloc(0);
  const hash = createHash('sha256');
  let handle: fs.FileHandle | undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NEXUS_FILE_LIMITS.timeoutMs);
  const iterator = stream[Symbol.asyncIterator]();
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(new NexusFileError(408, 'File upload timed out')), {
      once: true,
    });
  });
  const next = () => Promise.race([iterator.next(), aborted]);
  try {
    handle = await fs.open(staging, 'wx', 0o600);
    while (true) {
      const item = await next();
      if (item.done) break;
      const chunk = Buffer.from(item.value);
      size += chunk.length;
      if (size > NEXUS_FILE_LIMITS.bytes) error(413, 'File exceeds 20 MB limit');
      await freeSpace(chunk.length);
      if (prefix.length < 65536) prefix = Buffer.concat([prefix, chunk.subarray(0, 65536 - prefix.length)]);
      hash.update(chunk);
      await handle.writeFile(chunk);
    }
    if (!size) error(400, 'Empty file upload');
    fsyncSync(handle.fd);
    await handle.close();
    handle = undefined;
    const sha256 = hash.digest('hex'),
      mimeType = detectMime(prefix, input.declaredMime);
    if (input.expectedSha256 && input.expectedSha256 !== sha256) error(400, 'File hash mismatch');
    await mutate('UPDATE nexus_file_blob SET sha256=:sha256,"sizeBytes"=:size,"updatedAt"=now() WHERE id=:blobId', {
      sha256,
      size,
      blobId,
    });
    return await sequelize.transaction(async (transaction) => {
      await lock(transaction);
      if (input.taskId)
        await requireFileLease(
          {
            ownerChatId: input.ownerChatId,
            taskId: input.taskId,
            leaseToken: input.leaseToken || '',
            attempt: input.attempt || 0,
          },
          transaction,
        );
      const [existing] = await query<FileRow>('SELECT * FROM nexus_file WHERE id=:id FOR UPDATE', { id }, transaction);
      if (existing) {
        if (existing.ownerChatId !== input.ownerChatId) error(404, 'Artifact not found');
        if (existing.state !== 'ready') error(410, 'Artifact expired');
        await readNexusFile(input.ownerChatId, existing.id);
        if (
          existing.ownerChatId !== input.ownerChatId ||
          existing.sha256 !== sha256 ||
          Number(existing.sizeBytes) !== size ||
          existing.name !== input.name ||
          existing.declaredMime !== input.declaredMime ||
          existing.uploadTaskId !== (input.taskId || null)
        )
          error(409, 'Artifact ID already has different content or metadata');
        await mutate("UPDATE nexus_file_blob SET state='failed' WHERE id=:blobId", { blobId }, transaction);
        return toManifest(existing);
      }
      const [winner] = await query<{ id: string; storageKey: string }>(
        `SELECT id,"storageKey" FROM nexus_file_blob WHERE "ownerChatId"=:owner AND sha256=:sha256 AND "sizeBytes"=:size AND state='ready' FOR UPDATE`,
        { owner: input.ownerChatId, sha256, size },
        transaction,
      );
      const readyBlobId = winner?.id || blobId;
      if (winner) {
        const content = await readVerifiedBytes(winner.storageKey, size, sha256);
        if (content.length !== size || createHash('sha256').update(content).digest('hex') !== sha256)
          error(503, 'Stored file integrity failure');
        await mutate("UPDATE nexus_file_blob SET state='failed' WHERE id=:blobId", { blobId }, transaction);
      } else {
        const finalPath = await safePath(storageKey);
        await fs.rename(staging, finalPath);
        for (const directory of [path.dirname(staging), path.dirname(finalPath)]) {
          const descriptor = await fs.open(directory, 'r');
          try {
            fsyncSync(descriptor.fd);
          } finally {
            await descriptor.close();
          }
        }
        await mutate(
          `UPDATE nexus_file_blob SET state='ready',"reservedBytes"=:size,"updatedAt"=now() WHERE id=:blobId`,
          { size, blobId },
          transaction,
        );
      }
      const [file] = await query<FileRow>(
        `INSERT INTO nexus_file(id,"ownerChatId","blobId",name,"declaredMime","mimeType","sizeBytes",sha256,source,"telegramFileId","telegramUniqueId","uploadTaskId","uploadAttempt",state) VALUES (:id,:owner,:readyBlobId,:name,:declaredMime,:mimeType,:size,:sha256,:source,:telegramFileId,:telegramUniqueId,:taskId,:attempt,'ready') RETURNING *`,
        {
          id,
          owner: input.ownerChatId,
          readyBlobId,
          name: input.name,
          declaredMime: input.declaredMime,
          mimeType,
          size,
          sha256,
          source: input.source,
          telegramFileId: input.telegramFileId || null,
          telegramUniqueId: input.telegramUniqueId || null,
          taskId: input.taskId || null,
          attempt: input.attempt || null,
        },
        transaction,
      );
      return toManifest(file);
    });
  } catch (cause) {
    // A post-rename crash/error leaves a staging row whose ready bytes can be reconciled.
    if (cause instanceof NexusFileError) throw cause;
    if (cause?.code === 'ENOSPC') error(507, 'File storage is full');
    error(503, 'File upload failed');
  } finally {
    clearTimeout(timeout);
    if (handle) await handle.close().catch(() => {});
    const removed = await fs
      .unlink(staging)
      .then(() => true)
      .catch((cause) => cause.code === 'ENOENT');
    if (removed)
      await mutate(
        `UPDATE nexus_file_blob SET state='failed',"reservedBytes"=0,"updatedAt"=now() WHERE id=:blobId AND ((state='staging' AND sha256 IS NULL) OR state='failed')`,
        { blobId },
      ).catch(() => {});
  }
}

export async function taskFileManifest(
  taskId: string,
  direction: 'input' | 'output' = 'input',
  transaction?: Transaction,
): Promise<NexusFileManifest[]> {
  const rows = await query<FileRow>(
    `SELECT f.*,b.state "blobState",r.provenance,r."sourceMessageId",r.ordinal,r.availability FROM nexus_task_file r JOIN nexus_file f ON f.id=r."fileId" JOIN nexus_file_blob b ON b.id=f."blobId" WHERE r."taskId"=:taskId AND r.direction=:direction ORDER BY r.ordinal`,
    { taskId, direction },
    transaction,
  );
  return rows.map(toManifest);
}

export async function bindTaskInputs(
  task: NexusTask,
  refs: NexusInputFile[],
  transaction: Transaction,
  direction: 'input' | 'output' = 'input',
) {
  if (refs.length > (direction === 'input' ? 20 : 10) || new Set(refs.map((ref) => ref.id)).size !== refs.length)
    error(400, 'Invalid task file count or duplicate IDs');
  let total = 0,
    historyTotal = 0,
    directCount = 0,
    historyCount = 0;
  for (let ordinal = 0; ordinal < refs.length; ordinal++) {
    const ref = refs[ordinal];
    if (
      !isFileUuid(ref.id) ||
      !['current', 'quoted', 'history', ...(direction === 'output' ? ['generated'] : [])].includes(ref.provenance) ||
      (ref.sourceMessageId !== null && (!Number.isSafeInteger(ref.sourceMessageId) || ref.sourceMessageId < 1))
    )
      error(400, 'Invalid task file reference');
    const [row] = await query<FileRow>(
      `SELECT f.*,b.state "blobState", EXISTS(SELECT 1 FROM nexus_task_file r WHERE r."fileId"=f.id) bound FROM nexus_file f JOIN nexus_file_blob b ON b.id=f."blobId" WHERE f.id=:id AND f."ownerChatId"=:owner FOR UPDATE OF f,b`,
      { id: ref.id, owner: task.ownerChatId },
      transaction,
    );
    if (!row) error(404, 'File not found');
    const available =
      row.state === 'ready' &&
      row.blobState === 'ready' &&
      (row.bound || new Date(row.expiresAt).getTime() > Date.now());
    const selectedAvailability = ref.availability || (available ? 'ready' : 'expired');
    if ((!available || selectedAvailability !== 'ready') && ref.provenance !== 'history') error(410, 'File expired');
    if (!['ready', 'expired', 'metadata-only'].includes(selectedAvailability)) error(400, 'Invalid file availability');
    if (direction === 'output' && (row.uploadTaskId !== task.id || row.source !== 'generated'))
      error(409, 'Artifact was not uploaded for this task');
    if (direction === 'input' && row.source === 'generated' && row.uploadTaskId === task.id)
      error(409, 'Output cannot be bound as current input');
    if (ref.provenance === 'history') {
      if (selectedAvailability === 'ready') historyTotal += Number(row.sizeBytes);
      historyCount++;
    } else {
      total += Number(row.sizeBytes);
      directCount++;
    }
    if (
      total > NEXUS_FILE_LIMITS.total ||
      historyTotal > NEXUS_FILE_LIMITS.total ||
      directCount > 10 ||
      historyCount > 10
    )
      error(413, 'Task files exceed aggregate limits');
    await mutate(
      `INSERT INTO nexus_task_file("taskId","fileId",direction,provenance,"sourceMessageId",ordinal,availability) VALUES (:taskId,:fileId,:direction,:provenance,:sourceMessageId,:ordinal,:availability)`,
      {
        taskId: task.id,
        fileId: ref.id,
        direction,
        provenance: ref.provenance,
        sourceMessageId: ref.sourceMessageId,
        ordinal,
        availability: selectedAvailability,
      },
      transaction,
    );
  }
}

export async function readNexusFile(
  ownerChatId: string,
  fileId: string,
): Promise<{ bytes: Buffer; file: NexusFileManifest }> {
  await requireNexusTaskOwner(ownerChatId);
  if (!isFileUuid(fileId)) error(404, 'File not found');
  return sequelize.transaction(async (transaction) => {
    const [row] = await query<FileRow>(
      `SELECT f.*,b."storageKey",b.state "blobState", EXISTS(SELECT 1 FROM nexus_task_file r WHERE r."fileId"=f.id AND r.availability='ready') bound FROM nexus_file f JOIN nexus_file_blob b ON b.id=f."blobId" WHERE f.id=:fileId AND f."ownerChatId"=:owner FOR UPDATE OF b`,
      { fileId, owner: ownerChatId },
      transaction,
    );
    if (!row) error(404, 'File not found');
    if (
      row.state !== 'ready' ||
      row.blobState !== 'ready' ||
      (!row.bound && new Date(row.expiresAt).getTime() <= Date.now())
    )
      error(410, 'File expired');
    let bytes: Buffer;
    try {
      bytes = await readVerifiedBytes(row.storageKey, Number(row.sizeBytes), row.sha256);
    } catch {
      error(503, 'Stored file is unavailable');
    }
    if (bytes.length !== Number(row.sizeBytes) || createHash('sha256').update(bytes).digest('hex') !== row.sha256)
      error(503, 'Stored file integrity failure');
    return { bytes, file: toManifest(row) };
  });
}

export async function readTaskNexusFile(input: {
  ownerChatId: string;
  taskId: string;
  fileId: string;
  leaseToken: string;
  attempt: number;
}) {
  if (!isFileUuid(input.taskId) || !isFileUuid(input.fileId)) error(404, 'File not found');
  const [association] = await query<{ availability: string }>(
    `SELECT r.availability FROM nexus_task_file r JOIN nexus_file f ON f.id=r."fileId" JOIN nexus_task t ON t.id=r."taskId" WHERE r."taskId"=:taskId AND r."fileId"=:fileId AND f."ownerChatId"=:ownerChatId AND t."ownerChatId"=:ownerChatId`,
    { ...input },
  );
  if (!association) error(404, 'File not found');
  await requireFileLease(input);
  if (association.availability !== 'ready') error(410, 'File unavailable in this task');
  return readNexusFile(input.ownerChatId, input.fileId);
}

export async function artifactManifest(ownerChatId: string, taskId: string, ids: string[], transaction?: Transaction) {
  validateFileIds(ids);
  const files: NexusFileManifest[] = [];
  for (const id of ids) {
    const [row] = await query<FileRow>(
      `SELECT f.*,b.state "blobState" FROM nexus_file f JOIN nexus_file_blob b ON b.id=f."blobId" WHERE f.id=:id AND f."ownerChatId"=:owner AND f."uploadTaskId"=:taskId AND f.source='generated'`,
      { id, owner: ownerChatId, taskId },
      transaction,
    );
    if (!row) error(404, 'Artifact not found');
    files.push(toManifest(row));
  }
  if (files.reduce((sum, file) => sum + file.sizeBytes, 0) > NEXUS_FILE_LIMITS.total)
    error(413, 'Artifact total limit exceeded');
  return files;
}

// Called only by the designated gateway maintenance loop. No network request or
// deletion is performed while a database transaction is held open.
export async function maintainNexusFiles() {
  await mutate(`DELETE FROM nexus_chat_file WHERE "createdAt"<now()-interval '24 hours'`);
  const staged = await query<{
    id: string;
    ownerChatId: string;
    storageKey: string;
    sha256: string | null;
    sizeBytes: string;
  }>(`SELECT * FROM nexus_file_blob WHERE state='staging' AND "updatedAt"<now()-interval '5 minutes'`);
  for (const row of staged) {
    // No caller received a ready file. Keep verifiable renamed files for the
    // orphan grace period, then release the abandoned reservation safely.
    await mutate(
      `UPDATE nexus_file_blob SET state='failed' WHERE id=:id AND state='staging' AND "updatedAt"<now()-interval '5 minutes'`,
      { id: row.id },
    );
  }
  const deleting = await sequelize.transaction(async (transaction) => {
    await lock(transaction);
    const rows = await query<{ id: string; storageKey: string }>(
      `SELECT b.id,b."storageKey" FROM nexus_file_blob b WHERE b.state IN ('ready','staging','deleting','failed') AND (b.state='deleting' OR b."updatedAt"<now()-interval '24 hours') AND NOT EXISTS (SELECT 1 FROM nexus_file f JOIN nexus_task_file r ON r."fileId"=f.id AND r.availability='ready' JOIN nexus_task t ON t.id=r."taskId" WHERE f."blobId"=b.id AND (t.status IN ('queued','leased') OR t."completedAt">now()-interval '30 days' OR EXISTS(SELECT 1 FROM nexus_task_notification n WHERE n."taskId"=t.id AND n."deliveredAt" IS NULL))) AND NOT EXISTS (SELECT 1 FROM nexus_file f WHERE f."blobId"=b.id AND f."expiresAt">now() AND NOT EXISTS (SELECT 1 FROM nexus_task_file r WHERE r."fileId"=f.id)) FOR UPDATE OF b SKIP LOCKED`,
      {},
      transaction,
    );
    for (const row of rows)
      await mutate(
        `UPDATE nexus_file_blob SET state='deleting',"updatedAt"=now() WHERE id=:id`,
        { id: row.id },
        transaction,
      );
    return rows;
  });
  for (const row of deleting) {
    for (const key of [row.storageKey, `staging/${row.id}`]) {
      await fs.unlink(await safePath(key, true)).catch((cause) => {
        if (cause.code !== 'ENOENT') throw cause;
      });
    }
    await sequelize.transaction(async (transaction) => {
      await mutate(`UPDATE nexus_file SET state='expired' WHERE "blobId"=:id`, { id: row.id }, transaction);
      await mutate(
        `UPDATE nexus_file_blob SET state='expired',"reservedBytes"=0,"updatedAt"=now() WHERE id=:id AND state='deleting'`,
        { id: row.id },
        transaction,
      );
    });
  }
}

let maintenanceRunning = false;
let maintenanceLastSuccess: string | null = null;
let maintenanceFailed = false;
export function startNexusFileMaintenance() {
  const run = async () => {
    if (maintenanceRunning) return;
    maintenanceRunning = true;
    try {
      await maintainNexusFiles();
      maintenanceLastSuccess = new Date().toISOString();
      maintenanceFailed = false;
      const health = await nexusFileHealth();
      if (health.warning) Logger.error('Nexus file storage requires attention', health, 'Tasks');
    } catch {
      maintenanceFailed = true;
      Logger.error('Nexus file maintenance failed', {}, 'Tasks');
    } finally {
      maintenanceRunning = false;
    }
  };
  void run();
  const timer = setInterval(() => {
    void run();
  }, 60_000);
  timer.unref();
  return () => clearInterval(timer);
}

export async function nexusFileHealth() {
  const [usage] = await query<{ used: string; staging: string; deleting: string; pending: string; uncertain: string }>(
    `SELECT COALESCE(SUM("reservedBytes"),0) used, COUNT(*) FILTER(WHERE state='staging') staging, COUNT(*) FILTER(WHERE state='deleting') deleting, (SELECT COUNT(*) FROM nexus_task_notification WHERE "deliveredAt" IS NULL) pending, (SELECT COUNT(*) FROM nexus_file_delivery WHERE state IN ('sending','uncertain')) uncertain FROM nexus_file_blob WHERE state<>'expired'`,
  );
  let freeBytes: number | null = null,
    reserveBytes: number | null = null,
    available = false;
  try {
    const stat = await fs.statfs(fileRoot());
    freeBytes = stat.bavail * stat.bsize;
    reserveBytes = Math.max(5_000_000_000, stat.blocks * stat.bsize * 0.1);
    available = true;
  } catch {
    /* No host paths or OS exception strings in health. */
  }
  const usedBytes = Number(usage.used);
  return {
    usedBytes,
    quotaBytes: NEXUS_FILE_LIMITS.store,
    freeBytes,
    reserveBytes,
    stagingCount: Number(usage.staging),
    deletingCount: Number(usage.deleting),
    pendingDeliveryCount: Number(usage.pending),
    uncertainDeliveryCount: Number(usage.uncertain),
    maintenanceLastSuccess,
    maintenanceFailed,
    warning:
      !available ||
      maintenanceFailed ||
      usedBytes >= NEXUS_FILE_LIMITS.store * 0.8 ||
      (freeBytes !== null &&
        reserveBytes !== null &&
        freeBytes - reserveBytes < Math.max(100_000_000, reserveBytes * 0.1)) ||
      Number(usage.uncertain) > 0,
  };
}
export async function taskFileDeliveryState(taskId: string) {
  const [state] = await query<{ pending: string; uncertain: string; notifications: string; undelivered: string }>(
    `SELECT COUNT(*) FILTER (WHERE d.state<>'sent') pending, COUNT(*) FILTER (WHERE d.state IN ('sending','uncertain')) uncertain, COUNT(DISTINCT n.id) notifications, COUNT(DISTINCT n.id) FILTER(WHERE n."deliveredAt" IS NULL) undelivered FROM nexus_task_notification n LEFT JOIN nexus_file_delivery d ON d."notificationId"=n.id WHERE n."taskId"=:taskId`,
    { taskId },
  );
  return {
    completed: Number(state.notifications) > 0 && Number(state.undelivered) === 0 && Number(state.pending) === 0,
    pendingCount: Number(state.pending),
    uncertainCount: Number(state.uncertain),
  };
}
