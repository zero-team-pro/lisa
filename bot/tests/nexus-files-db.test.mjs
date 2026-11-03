// Disposable PostgreSQL only. Does not load dotenv, call AI, or contact Telegram.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID, createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import { AdminUser, TelegramUser, NexusTaskNotification, sequelize } from '../dist/models/index.js';
import { createNexusTask, claimNexusTask, reportNexusTaskResult } from '../dist/services/nexusTasks.js';
import { stageNexusFile, readNexusFile, taskFileManifest, maintainNexusFiles } from '../dist/services/nexusFiles.js';
import tasks from '../dist/api/tasks.js';
if (process.env.POSTGRES_DB !== 'lisa_nexus_test' || process.env.POSTGRES_HOST !== '127.0.0.1')
  throw new Error('Requires disposable lisa_nexus_test on loopback');
const data = Buffer.from('Nexus file bytes\n'),
  hash = createHash('sha256').update(data).digest('hex');
const upload = (ownerChatId, options = {}, content = data) =>
  stageNexusFile(
    { ownerChatId, name: 'fixture.txt', declaredMime: 'text/plain', source: 'api', ...options },
    (async function* () {
      yield content;
    })(),
  );

test('filesystem transport: transactional ownership, leases, integrity, idempotency, quota and cleanup', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lisa-files-db-'));
  process.env.NEXUS_FILES_ROOT = root;
  const app = express();
  app.use('/tasks/v1', tasks);
  let server;
  try {
    await sequelize.query(
      await fs.readFile(new URL('../src/migrations/8_nexus_files.up.sql', import.meta.url), 'utf8'),
    );
    const admin = await AdminUser.create({ discordId: 'files-admin', role: 'globalAdmin' });
    const other = await AdminUser.create({ discordId: 'files-other', role: 'globalAdmin' });
    await TelegramUser.create({ id: 123, adminId: admin.id });
    await TelegramUser.create({ id: 456, adminId: other.id });
    process.env.NOTIFY_TOKENS = 'fake:123,other:456';
    const first = await upload('123');
    const duplicate = await upload('123');
    assert.notEqual(first.id, duplicate.id);
    assert.equal(first.sha256, hash);
    const [count] = await sequelize.query(`SELECT COUNT(*) FROM nexus_file_blob WHERE state='ready'`);
    assert.equal(Number(count[0].count), 1, 'same-owner bytes deduplicate');
    assert.deepEqual((await readNexusFile('123', first.id)).bytes, data);
    await assert.rejects(readNexusFile('456', first.id), (error) => error.status === 404);
    const actor = { type: 'telegram', telegramUserId: '123', adminUserId: admin.id };
    const task = (
      await createNexusTask({
        ownerChatId: '123',
        text: 'Read bytes',
        source: 'telegram',
        createdBy: actor,
        attachmentIds: [first.id],
        clientRequestId: 'file-task',
      })
    ).task;
    assert.equal((await taskFileManifest(task.id))[0].id, first.id);
    await assert.rejects(
      createNexusTask({
        ownerChatId: '123',
        text: 'Read bytes',
        source: 'telegram',
        createdBy: actor,
        attachmentIds: [duplicate.id],
        clientRequestId: 'file-task',
      }),
      /different attachments/,
    );
    const claimed = await claimNexusTask({ ownerChatId: '123', workerId: 'file-test', supportsConversations: true });
    assert.equal(claimed.task.id, task.id);
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const base = `http://127.0.0.1:${server.address().port}/tasks/v1`;
    const headers = { authorization: 'Bearer fake', 'x-nexus-lease': claimed.leaseToken, 'x-nexus-attempt': '1' };
    let response = await fetch(`${base}/${task.id}/files/${first.id}`, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/octet-stream');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), data);
    response = await fetch(`${base}/${task.id}/files/${first.id}`, {
      headers: { ...headers, 'x-nexus-lease': 'wrong' },
    });
    assert.equal(response.status, 409);
    response = await fetch(`${base}/${task.id}/files/${duplicate.id}`, { headers });
    assert.equal(response.status, 404);
    response = await fetch(`${base}/${task.id}/files/${first.id}`, {
      headers: { ...headers, authorization: 'Bearer other' },
    });
    assert.equal(response.status, 404);
    response = await fetch(`${base}/${task.id}/files/${first.id}`);
    assert.equal(response.status, 401);
    const artifactId = randomUUID();
    const put = async (content = data, extra = {}) =>
      fetch(`${base}/${task.id}/artifacts/${artifactId}`, {
        method: 'POST',
        headers: {
          ...headers,
          'content-type': 'application/octet-stream',
          'x-nexus-filename': 'answer.txt',
          'x-nexus-mime-type': 'text/plain',
          'x-nexus-sha256': createHash('sha256').update(content).digest('hex'),
          ...extra,
        },
        body: content,
      });
    response = await put();
    assert.equal(response.status, 201);
    assert.equal((await response.json()).file.id, artifactId);
    response = await put();
    assert.equal(response.status, 201, 'identical artifact upload is idempotent');
    response = await put(Buffer.from('changed'));
    assert.equal(response.status, 409);
    const result = {
      ownerChatId: '123',
      taskId: task.id,
      leaseToken: claimed.leaseToken,
      attempt: 1,
      provider: 'fake',
      outcome: 'completed',
      summary: 'Done',
      error: null,
      retryable: false,
      retryAt: null,
      artifacts: [artifactId],
    };
    assert.equal((await reportNexusTaskResult(result)).duplicate, false);
    assert.equal((await reportNexusTaskResult(result)).duplicate, true);
    assert.equal((await taskFileManifest(task.id, 'output')).length, 1);
    await assert.rejects(reportNexusTaskResult({ ...result, artifacts: [] }), /Conflicting/);
    const [deliveries] = await sequelize.query('SELECT * FROM nexus_file_delivery WHERE "fileId"=:id', {
      replacements: { id: artifactId },
    });
    assert.equal(deliveries.length, 1);
    await assert.rejects(upload('123', { expectedSha256: '0'.repeat(64) }), (error) => error.status === 400);
    const unsafe = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(unsafe);
    unsafe.writeUInt32BE(100000, 16);
    unsafe.writeUInt32BE(100000, 20);
    await assert.rejects(upload('123', { declaredMime: 'image/png' }, unsafe), (error) => error.status === 413);
    const quotaId = randomUUID();
    await sequelize.query(
      `INSERT INTO nexus_file_blob(id,"ownerChatId","storageKey",state,"reservedBytes") VALUES (:id,456,:key,'staging',10000000000)`,
      { replacements: { id: quotaId, key: `staging/${quotaId}` } },
    );
    let consumed = false;
    await assert.rejects(
      stageNexusFile(
        { ownerChatId: '123', name: 'x', declaredMime: 'text/plain', source: 'api' },
        (async function* () {
          consumed = true;
          yield data;
        })(),
      ),
      (error) => error.status === 507,
    );
    assert.equal(consumed, false, 'quota denial precedes stream reads');
    await sequelize.query('DELETE FROM nexus_file_blob WHERE id=:id', { replacements: { id: quotaId } });
    await sequelize.query(`UPDATE nexus_file_blob SET "updatedAt"=now()-interval '40 days' WHERE state='ready'`);
    await sequelize.query(`UPDATE nexus_task SET "completedAt"=now()-interval '40 days' WHERE id=:id`, {
      replacements: { id: task.id },
    });
    await sequelize.query(`UPDATE nexus_file SET "expiresAt"=now()-interval '1 day'`);
    await maintainNexusFiles();
    assert.deepEqual((await readNexusFile('123', first.id)).bytes, data, 'pending delivery pins bytes');
    await NexusTaskNotification.update({ deliveredAt: new Date() }, { where: { taskId: task.id } });
    await maintainNexusFiles();
    await assert.rejects(readNexusFile('123', first.id), (error) => error.status === 410);
    await admin.update({ role: 'user' });
    await assert.rejects(upload('123'));
    const rows = await sequelize.query(`SELECT * FROM nexus_file`);
    assert.ok(rows[0].length >= 3, 'audit metadata survives cleanup');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await sequelize.close();
    await fs.rm(root, { recursive: true, force: true });
  }
});
