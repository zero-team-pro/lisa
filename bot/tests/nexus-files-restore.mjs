// A two-process paired backup/restore fixture; use only an isolated disposable DB.
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { AdminUser, TelegramUser, sequelize } from '../dist/models/index.js';
import { createNexusTask, claimNexusTask, reportNexusTaskResult } from '../dist/services/nexusTasks.js';
import { stageNexusFile, readNexusFile, maintainNexusFiles } from '../dist/services/nexusFiles.js';
if (process.env.POSTGRES_DB !== 'lisa_nexus_test' || process.env.POSTGRES_HOST !== '127.0.0.1')
  throw new Error('Requires disposable loopback database');
if (process.env.NEXUS_FILES_ROOT !== '/tmp/nexus-file-restore')
  throw new Error('Requires fixed isolated restore store');
process.env.NOTIFY_TOKENS = 'fake:123';
const inputId = '01000000-0000-4000-8000-000000000001',
  outputId = '01000000-0000-4000-8000-000000000002',
  stagedId = '01000000-0000-4000-8000-000000000003';
const payload = Buffer.from('paired-backup verified bytes\n');
const sha256 = createHash('sha256').update(payload).digest('hex');
try {
  if (process.argv[2] === 'seed') {
    const admin = await AdminUser.create({ discordId: 'restore-admin', role: 'globalAdmin' });
    await TelegramUser.create({ id: 123, adminId: admin.id });
    await stageNexusFile(
      { ownerChatId: '123', name: 'input.txt', declaredMime: 'text/plain', source: 'api', fileId: inputId },
      (async function* () {
        yield payload;
      })(),
    );
    const task = (
      await createNexusTask({
        ownerChatId: '123',
        source: 'telegram',
        text: 'restore fixture',
        clientRequestId: 'paired-restore',
        createdBy: { type: 'telegram', telegramUserId: '123', adminUserId: admin.id },
        attachmentIds: [inputId],
      })
    ).task;
    const claimed = await claimNexusTask({ ownerChatId: '123', workerId: 'restore-seed', supportsConversations: true });
    await stageNexusFile(
      {
        ownerChatId: '123',
        name: 'output.txt',
        declaredMime: 'text/plain',
        source: 'generated',
        fileId: outputId,
        taskId: task.id,
        attempt: claimed.task.attemptCount,
        leaseToken: claimed.leaseToken,
      },
      (async function* () {
        yield payload;
      })(),
    );
    await reportNexusTaskResult({
      ownerChatId: '123',
      taskId: task.id,
      leaseToken: claimed.leaseToken,
      attempt: 1,
      provider: 'fake',
      outcome: 'completed',
      summary: 'restore fixture',
      error: null,
      retryable: false,
      retryAt: null,
      artifacts: [outputId],
    });
    await fs.writeFile(path.join(process.env.NEXUS_FILES_ROOT, 'staging', stagedId), 'unfinished', { mode: 0o600 });
    await sequelize.query(
      `INSERT INTO nexus_file_blob(id,"ownerChatId","storageKey",state,"reservedBytes") VALUES (:id,123,:key,'staging',20000000)`,
      { replacements: { id: stagedId, key: `blobs/123/${stagedId}` } },
    );
    console.log('SEED_READY paired database+filesystem checkpoint contains pending artifact and staged upload');
  } else if (process.argv[2] === 'verify') {
    for (const id of [inputId, outputId]) {
      const result = await readNexusFile('123', id);
      assert.deepEqual(result.bytes, payload);
      assert.equal(result.file.sha256, sha256);
    }
    assert.equal(await fs.readFile(path.join(process.env.NEXUS_FILES_ROOT, 'staging', stagedId), 'utf8'), 'unfinished');
    const [notifications] = await sequelize.query(
      `SELECT COUNT(*) FROM nexus_task_notification n JOIN nexus_task t ON t.id=n."taskId" WHERE t."clientRequestId"='paired-restore' AND n."deliveredAt" IS NULL`,
    );
    assert.ok(Number(notifications[0].count) > 0);
    await sequelize.query(`UPDATE nexus_file_blob SET "updatedAt"=now()-interval '40 days'`);
    await sequelize.query(`UPDATE nexus_task SET "completedAt"=now()-interval '40 days'`);
    await sequelize.query(`UPDATE nexus_file SET "expiresAt"=now()-interval '1 day'`);
    await maintainNexusFiles();
    assert.deepEqual(
      (await readNexusFile('123', outputId)).bytes,
      payload,
      'pending output remains pinned after restore',
    );
    const [orphan] = await sequelize.query('SELECT state FROM nexus_file_blob WHERE id=:id', {
      replacements: { id: stagedId },
    });
    assert.equal(orphan[0].state, 'expired');
    await assert.rejects(
      fs.stat(path.join(process.env.NEXUS_FILES_ROOT, 'staging', stagedId)),
      (cause) => cause.code === 'ENOENT',
    );
    console.log('RESTORE_VERIFIED hashes, pending artifacts, staged reconciliation and metadata');
  } else throw new Error('Expected seed or verify mode');
} finally {
  await sequelize.close();
}
