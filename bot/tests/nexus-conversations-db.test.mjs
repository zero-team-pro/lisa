// Run only in the isolated Docker database described in docs/nexus-conversations.md.
// This intentionally never loads dotenv, calls sync(), sends Telegram, or runs AI.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  AdminUser,
  TelegramUser,
  NexusTask,
  NexusChatMessage,
  NexusTaskNotification,
  sequelize,
} from '../dist/models/index.js';
import { createNexusTask, claimNexusTask, reportNexusTaskResult } from '../dist/services/nexusTasks.js';
import { notify } from '../dist/modules/telegram/commands/notify.js';
import { rememberNexusChatMessage, nexusChatContext, nexusReplyTask } from '../dist/services/nexusChat.js';

if (process.env.POSTGRES_DB !== 'lisa_nexus_test' || process.env.POSTGRES_HOST !== '127.0.0.1')
  throw new Error('Requires isolated lisa_nexus_test on loopback');
const actor = (chat, admin) => ({ type: 'telegram', telegramUserId: chat, adminUserId: admin.id });
const create = (chat, admin, text, parent = null) =>
  createNexusTask({
    ownerChatId: chat,
    createdBy: actor(chat, admin),
    source: 'telegram',
    text,
    interaction: {
      sourceMessageId: 42,
      parentTaskId: parent?.id || null,
      conversationId: parent?.interaction?.conversationId || '',
      context: [],
    },
  });
const report = (chat, claim) =>
  reportNexusTaskResult({
    ownerChatId: chat,
    taskId: claim.task.id,
    attempt: claim.task.attemptCount,
    leaseToken: claim.leaseToken,
    outcome: 'completed',
    provider: 'fake',
    summary: 'Done',
    error: null,
    retryable: false,
    retryAt: null,
  });

test('v5 -> v6 preserves data, isolates owners, and serializes concurrent continuations', async () => {
  try {
    const legacyId = randomUUID();
    await sequelize.query(
      `INSERT INTO nexus_task (id, "ownerChatId", text, source, "createdBy", "createdAt", "updatedAt") VALUES (:id, 123, 'legacy', 'telegram', '{"type":"telegram","telegramUserId":"123","adminUserId":1}', now(), now())`,
      { replacements: { id: legacyId } },
    );
    await sequelize.query(
      await readFile(new URL('../src/migrations/6_nexus_conversations.up.sql', import.meta.url), 'utf8'),
    );
    await sequelize.query(await readFile(new URL('../src/migrations/7_nexus_capture.up.sql', import.meta.url), 'utf8'));
    assert.equal((await NexusTask.findByPk(legacyId)).text, 'legacy');
    await NexusTask.destroy({ where: { id: legacyId } });
    const admin = await AdminUser.create({ discordId: 'test-admin', role: 'globalAdmin' });
    const other = await AdminUser.create({ discordId: 'other-admin', role: 'globalAdmin' });
    const regular = await AdminUser.create({ discordId: 'test-user', role: 'user' });
    for (const [id, user] of [
      [123, admin],
      [456, other],
      [789, regular],
    ])
      await TelegramUser.create({ id, adminId: user.id });
    process.env.NOTIFY_TOKENS = 'fake:123,other:456,user:789';
    await assert.rejects(create('789', regular, 'denied'));
    await assert.rejects(create('999', admin, 'unlinked'));
    await assert.rejects(create('-123', admin, 'group'));
    const root = (await create('123', admin, 'root')).task;
    const oldClaim = await claimNexusTask({ ownerChatId: '123', workerId: 'old' });
    assert.equal(oldClaim.task, null);
    const rootClaim = await claimNexusTask({ ownerChatId: '123', workerId: 'new', supportsConversations: true });
    assert.equal(rootClaim.task.id, root.id);
    await report('123', rootClaim);
    await root.reload();
    assert.equal(root.interaction.conversationId, root.id);
    await assert.rejects(create('456', other, 'foreign continuation', root));
    await create('123', admin, 'first follow-up', root);
    await create('123', admin, 'second follow-up', root);
    const claims = await Promise.all(
      [1, 2].map((i) => claimNexusTask({ ownerChatId: '123', workerId: `worker-${i}`, supportsConversations: true })),
    );
    assert.equal(claims.filter((item) => item.task).length, 1);
    await report(
      '123',
      claims.find((item) => item.task),
    );
    const second = await claimNexusTask({ ownerChatId: '123', workerId: 'worker-3', supportsConversations: true });
    assert.ok(second.task);
    await report('123', second);
    const notification = await NexusTaskNotification.findOne({ where: { taskId: root.id } });
    let sentId = 59;
    const bot = { telegram: { sendMessage: async () => ({ message_id: ++sentId, chat: { id: 123 } }) } };
    assert.equal(
      (await notify.exec({ chatId: 123, text: 'Done', nexusNotificationId: notification.id }, bot)).isSent,
      true,
    );
    assert.equal(
      (await notify.exec({ chatId: 123, text: 'Done', nexusNotificationId: notification.id }, bot)).isSent,
      true,
    );
    await notification.reload();
    assert.deepEqual(notification.messageIds, [60, 61]);
    assert.equal((await nexusReplyTask('123', 61)).id, root.id);
    assert.equal(await nexusReplyTask('456', 61), null);
    await rememberNexusChatMessage('123', 1, 'assistant', 'warning');
    await rememberNexusChatMessage('456', 2, 'assistant', 'other owner secret');
    await rememberNexusChatMessage('789', 3, 'user', 'must not persist');
    await rememberNexusChatMessage('123', 4, 'user', '/linkMe secret');
    assert.equal(await NexusChatMessage.count({ where: { ownerChatId: '789' } }), 0);
    assert.deepEqual(await nexusChatContext('123', 5), [{ role: 'assistant', text: 'warning' }]);
    await admin.update({ role: 'user' });
    await assert.rejects(nexusReplyTask('123', 60));
    await assert.rejects(nexusChatContext('123', 99));
    await assert.rejects(create('123', admin, 'revoked'));
    await assert.rejects(claimNexusTask({ ownerChatId: '123', workerId: 'revoked', supportsConversations: true }));
    await sequelize.query(
      await readFile(new URL('../src/migrations/6_nexus_conversations.down.sql', import.meta.url), 'utf8'),
    );
    const [rows] = await sequelize.query('SELECT text FROM nexus_task WHERE id = :id', {
      replacements: { id: root.id },
    });
    assert.equal(rows[0].text, 'root');
    await sequelize.query(
      await readFile(new URL('../src/migrations/6_nexus_conversations.up.sql', import.meta.url), 'utf8'),
    );
  } finally {
    await sequelize.close();
  }
});
