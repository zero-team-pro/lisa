// Requires disposable, network-isolated PostgreSQL with all SQL migrations applied.
// Never loads dotenv or calls sequelize.sync().
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sequelize, Server, AdminUser, TelegramUser, DiscordUser, AIOwner, NexusTask } from '../dist/models/index.js';
import { BotModuleIdList } from '../dist/types.js';
import { createNexusTask, claimNexusTask, reportNexusTaskResult } from '../dist/services/nexusTasks.js';

const databases = ['lisa_schema_test', 'lisa_schema_upgrade_test'];
if (!databases.includes(process.env.POSTGRES_DB) || process.env.POSTGRES_HOST !== '127.0.0.1')
  throw new Error('Requires isolated schema test database on loopback');

test('SQL migrations supply every ORM table/column, enum, and Nexus operation without sync', async () => {
  try {
    await sequelize.authenticate();
    // Every model selects all its mapped columns, not just SELECT 1.
    for (const model of Object.values(sequelize.models)) await model.findAll({ limit: 1, raw: true });
    for (const model of Object.values(sequelize.models)) {
      const indexes = await sequelize.getQueryInterface().showIndex(model.getTableName());
      for (const required of model.options.indexes || []) {
        const fields = required.fields.map((field) =>
          typeof field === 'string' ? field : field.name || field.attribute,
        );
        assert.ok(
          indexes.some(
            (index) =>
              (!required.unique || (index.unique && index.fields.length === fields.length)) &&
              JSON.stringify(index.fields.slice(0, fields.length).map((field) => field.attribute)) ===
                JSON.stringify(fields),
          ),
          `${model.tableName}: missing index on ${fields.join(', ')}`,
        );
      }
    }
    const [labels] = await sequelize.query(
      `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'enum_server_modules' ORDER BY e.enumsortorder`,
    );
    for (const module of BotModuleIdList)
      assert.ok(
        labels.some((row) => row.enumlabel === module),
        module,
      );
    if (process.env.POSTGRES_DB.endsWith('upgrade_test')) {
      assert.ok(labels.some((row) => row.enumlabel === 'historical-module'));
      assert.equal((await Server.findByPk('existing-server')).prefix, '!');
      assert.equal((await NexusTask.findOne({ where: { text: 'existing task' } })).status, 'completed');
    }
    const admin = await AdminUser.create({ discordId: 'schema-admin', role: 'globalAdmin' });
    await TelegramUser.create({ id: 123, adminId: admin.id });
    const server = await Server.create({ id: 'schema-server', modules: [...BotModuleIdList] });
    await server.reload();
    assert.deepEqual(server.modules, [...BotModuleIdList]);
    await DiscordUser.create({ discordId: 'schema-user', serverId: server.id });
    await AIOwner.create({ owner: '123', ownerType: 'telegramUser', balance: 0 });
    const created = await createNexusTask({
      ownerChatId: '123',
      source: 'telegram',
      text: 'schema task',
      createdBy: { type: 'telegram', telegramUserId: '123', adminUserId: admin.id },
      interaction: { sourceMessageId: 42, conversationId: '', parentTaskId: null, context: [] },
    });
    const claim = await claimNexusTask({ ownerChatId: '123', workerId: 'schema-fixture', supportsConversations: true });
    assert.equal(claim.task.id, created.task.id);
    await reportNexusTaskResult({
      ownerChatId: '123',
      taskId: created.task.id,
      attempt: claim.task.attemptCount,
      leaseToken: claim.leaseToken,
      outcome: 'completed',
      provider: 'fake',
      summary: 'schema check passed',
      error: null,
      retryable: false,
      retryAt: null,
    });
    // Prove ORM reads need no schema privileges. These changes are rolled back.
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('SET TRANSACTION READ ONLY', { transaction });
      for (const model of Object.values(sequelize.models)) await model.findAll({ limit: 1, raw: true, transaction });
    });
  } finally {
    await sequelize.close();
  }
});
