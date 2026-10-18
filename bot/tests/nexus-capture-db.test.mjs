// Disposable loopback database only. No dotenv, schema sync, Telegram or AI calls.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  AdminUser,
  TelegramUser,
  NexusTask,
  NexusTaskAttempt,
  NexusTaskNotification,
  sequelize,
} from '../dist/models/index.js';
import {
  createNexusTask,
  claimNexusTask,
  reportNexusTaskResult,
  getNexusTask,
  sweepExpiredNexusTaskLeases,
} from '../dist/services/nexusTasks.js';
import { tickNexusTyping } from '../dist/services/nexusTyping.js';
if (process.env.POSTGRES_DB !== 'lisa_nexus_test' || process.env.POSTGRES_HOST !== '127.0.0.1')
  throw new Error('Requires disposable lisa_nexus_test on loopback');
const operation = {
  kind: 'tiktok.capture',
  version: 1,
  routingVersion: 1,
  url: 'https://vt.tiktok.com/TEST/',
  note: 'owner note',
};
const capability = { supportsConversations: true, supportedOperations: ['tiktok.capture.v1'] };
const migration = async (name) =>
  sequelize.query(await readFile(new URL('../src/migrations/' + name, import.meta.url), 'utf8'));

test('v6→v7 capture migration, compatibility, quiet recovery and ownership', async () => {
  try {
    const legacyId = randomUUID();
    await sequelize.query(
      `INSERT INTO nexus_task (id,"ownerChatId",text,source,"createdAt","updatedAt") VALUES (:id,123,'legacy','telegram',now(),now())`,
      { replacements: { id: legacyId } },
    );
    await migration('7_nexus_capture.up.sql');
    assert.equal((await NexusTask.findByPk(legacyId)).operation, null);
    await NexusTask.destroy({ where: { id: legacyId } });
    for (const model of Object.values(sequelize.models)) await model.findAll({ limit: 1, raw: true });
    const admin = await AdminUser.create({ discordId: 'capture-admin', role: 'globalAdmin' });
    const other = await AdminUser.create({ discordId: 'other-admin', role: 'globalAdmin' });
    const user = await AdminUser.create({ discordId: 'ordinary', role: 'user' });
    for (const [id, owner] of [
      [123, admin],
      [456, other],
      [789, user],
    ])
      await TelegramUser.create({ id, adminId: owner.id });
    process.env.NOTIFY_TOKENS = 'fake:123,other:456';
    const input = {
      ownerChatId: '123',
      text: 'TikTok capture',
      source: 'telegram',
      createdBy: { type: 'telegram', telegramUserId: '123', adminUserId: admin.id },
      operation,
      interaction: { sourceMessageId: 42, conversationId: '', parentTaskId: null, context: [] },
    };
    await assert.rejects(
      createNexusTask({
        ...input,
        ownerChatId: '789',
        createdBy: { type: 'telegram', telegramUserId: '789', adminUserId: user.id },
      }),
    );
    await assert.rejects(createNexusTask({ ...input, ownerChatId: '-123' }));
    const saved = (await createNexusTask({ ...input, clientRequestId: 'telegram:123:42' })).task;
    assert.equal((await createNexusTask({ ...input, clientRequestId: 'telegram:123:42' })).created, false);
    await assert.rejects(
      createNexusTask({ ...input, clientRequestId: 'telegram:123:42', operation: { ...operation, note: 'changed' } }),
    );
    assert.equal(await NexusTaskNotification.count(), 0);
    assert.equal(
      (await claimNexusTask({ ownerChatId: '123', workerId: 'old', supportsConversations: true })).task,
      null,
    );
    await assert.rejects(getNexusTask('456', saved.id));
    const replies = [];
    await tickNexusTyping({
      telegram: {
        sendChatAction: async (...args) => {
          replies.push(args);
        },
      },
    });
    assert.equal(replies.length, 0);
    const concurrent = await Promise.all(
      [1, 2].map((i) => claimNexusTask({ ownerChatId: '123', workerId: 'new-' + i, ...capability })),
    );
    const claimed = concurrent.find((value) => value.task);
    assert.equal(concurrent.filter((value) => value.task).length, 1);
    assert.equal(claimed.task.id, saved.id);
    const report = {
      ownerChatId: '123',
      taskId: saved.id,
      attempt: 1,
      leaseToken: claimed.leaseToken,
      provider: 'local',
      summary: null,
      error: 'temporary',
      outcome: 'retry',
      retryable: true,
      retryAt: new Date(Date.now() + 60000),
      capture: { libraryId: '00001', state: 'link_only', reasonCode: 'network' },
    };
    await reportNexusTaskResult(report);
    assert.equal(await NexusTaskNotification.count(), 0);
    await saved.reload();
    assert.equal(saved.capture.libraryId, '00001');
    await saved.update({ availableAt: new Date(Date.now() - 1000) });
    const second = await claimNexusTask({ ownerChatId: '123', workerId: 'new', ...capability });
    const completion = {
      ...report,
      attempt: 2,
      leaseToken: second.leaseToken,
      outcome: 'completed',
      summary: 'internal saved',
      error: null,
      retryable: false,
      retryAt: null,
      capture: { libraryId: '00001', state: 'saved', reasonCode: null },
    };
    await assert.rejects(reportNexusTaskResult({ ...completion, provider: 'codex' }));
    await reportNexusTaskResult(completion);
    assert.equal((await reportNexusTaskResult(completion)).duplicate, true);
    await assert.rejects(
      reportNexusTaskResult({ ...completion, capture: { ...completion.capture, libraryId: '00002' } }),
    );
    assert.equal(await NexusTaskNotification.count(), 0);
    assert.equal((await NexusTaskAttempt.findOne({ where: { taskId: saved.id, attempt: 2 } })).capture.state, 'saved');
    const future = (await createNexusTask({ ...input, operation: { ...operation, note: 'future' } })).task;
    await sequelize.query(`UPDATE nexus_task SET operation=jsonb_set(operation,'{version}','2') WHERE id=:id`, {
      replacements: { id: future.id },
    });
    assert.equal((await claimNexusTask({ ownerChatId: '123', workerId: 'new', ...capability })).task, null);
    const failed = (await createNexusTask({ ...input, operation: { ...operation, note: 'terminal' } })).task;
    const failedClaim = await claimNexusTask({ ownerChatId: '123', workerId: 'new', ...capability });
    await reportNexusTaskResult({
      ...report,
      taskId: failed.id,
      leaseToken: failedClaim.leaseToken,
      outcome: 'failed',
      retryable: false,
      retryAt: null,
    });
    assert.equal(await NexusTaskNotification.count({ where: { taskId: failed.id } }), 1);
    assert.match((await NexusTaskNotification.findOne({ where: { taskId: failed.id } })).text, /#00001/);
    const abandoned = (await createNexusTask({ ...input, operation: { ...operation, note: 'abandoned' } })).task;
    await claimNexusTask({ ownerChatId: '123', workerId: 'new', ...capability });
    await abandoned.update({ attemptCount: 3, leaseExpiresAt: new Date(Date.now() - 1000) });
    await sweepExpiredNexusTaskLeases();
    await sweepExpiredNexusTaskLeases();
    assert.equal(await NexusTaskNotification.count({ where: { taskId: abandoned.id } }), 1);
    assert.match((await NexusTaskNotification.findOne({ where: { taskId: abandoned.id } })).text, /не подтверждён/);
    const generic = (await createNexusTask({ ...input, operation: null, text: 'ordinary', interaction: undefined }))
      .task;
    const genericClaim = await claimNexusTask({ ownerChatId: '123', workerId: 'old' });
    assert.equal(genericClaim.task.id, generic.id);
    await reportNexusTaskResult({
      ...completion,
      taskId: generic.id,
      attempt: 1,
      leaseToken: genericClaim.leaseToken,
      provider: 'fake',
      capture: null,
    });
    assert.equal(await NexusTaskNotification.count({ where: { taskId: generic.id } }), 1);
    await admin.update({ role: 'user' });
    await assert.rejects(claimNexusTask({ ownerChatId: '123', workerId: 'revoked', ...capability }));
    await assert.rejects(migration('7_nexus_capture.down.sql'));
    await future.update({ status: 'failed', availableAt: null });
    await migration('7_nexus_capture.down.sql');
    const [rows] = await sequelize.query('SELECT text,status FROM nexus_task WHERE id=:id', {
      replacements: { id: generic.id },
    });
    assert.equal(rows[0].text, 'ordinary');
    assert.equal(rows[0].status, 'completed');
    await migration('7_nexus_capture.up.sql');
    assert.equal((await NexusTask.findByPk(generic.id)).operation, null);
  } finally {
    await sequelize.close();
  }
});
