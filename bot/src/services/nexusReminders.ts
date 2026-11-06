import { randomUUID } from 'crypto';
import { QueryTypes } from 'sequelize';
import { sequelize } from '@/models';
import { requireNexusTaskOwner } from '@/services/nexusTaskAuthorization';
import { requireFileLease } from '@/services/nexusFiles';
import type { Bridge } from '@/controllers/bridge';
import { bridgeRequest } from '@/utils/bridgeRequest';

export class ReminderValidationError extends Error {}

type Reminder = {
  id: string;
  ownerChatId: string;
  taskId: string | null;
  sourceMessageId: number | null;
  text: string;
  dueAt: Date;
  state: string;
  reactionState: string;
};

export async function createReminder(
  ownerChatId: string,
  input: { id: string; text: string; dueAt: string; taskId?: string; leaseToken?: string; attempt?: number },
) {
  await requireNexusTaskOwner(ownerChatId);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id) ||
    typeof input.text !== 'string' ||
    !input.text.trim() ||
    input.text.length > 1000 ||
    typeof input.dueAt !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(input.dueAt) ||
    !Number.isFinite(Date.parse(input.dueAt))
  )
    throw new ReminderValidationError('Invalid reminder');
  return sequelize.transaction(async (transaction) => {
    const existing = await sequelize.query<Reminder>(
      'SELECT * FROM nexus_reminder WHERE id=:id AND "ownerChatId"=:ownerChatId',
      { replacements: { id: input.id, ownerChatId }, type: QueryTypes.SELECT, transaction },
    );
    if (existing.length) {
      if (
        existing[0].text !== input.text.trim() ||
        new Date(existing[0].dueAt).getTime() !== Date.parse(input.dueAt) ||
        existing[0].taskId !== (input.taskId || null)
      )
        throw new ReminderValidationError('Reminder id conflict');
      return existing[0];
    }
    if (Date.parse(input.dueAt) <= Date.now()) throw new ReminderValidationError('Reminder time is in the past');
    let messageId: number | null = null;
    if (input.taskId) {
      const task = await requireFileLease(
        { ownerChatId, taskId: input.taskId, leaseToken: input.leaseToken || '', attempt: input.attempt || 0 },
        transaction,
      );
      messageId = task.source === 'telegram' ? task.interaction?.sourceMessageId || null : null;
    }
    const [row] = await sequelize.query<Reminder>(
      `INSERT INTO nexus_reminder (id,"ownerChatId","taskId","sourceMessageId",text,"dueAt","reactionState") VALUES (:id,:ownerChatId,:taskId,:messageId,:text,:dueAt,:reactionState) RETURNING *`,
      {
        replacements: {
          id: input.id,
          ownerChatId,
          taskId: input.taskId || null,
          messageId,
          text: input.text.trim(),
          dueAt: input.dueAt,
          reactionState: messageId ? 'pending' : 'none',
        },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    return row;
  });
}

export async function flushReminders(bridge: Bridge) {
  if (!bridge.isConnected()) return;
  // A process interruption during Telegram delivery is uncertain; never blindly send twice.
  await sequelize.query(
    `UPDATE nexus_reminder SET state='uncertain', "updatedAt"=now() WHERE state='sending' AND "updatedAt" < now()-interval '5 minutes'`,
  );
  await sequelize.query(
    `UPDATE nexus_reminder SET "reactionState"='pending', "updatedAt"=now() WHERE "reactionState"='sending' AND "updatedAt" < now()-interval '5 minutes'`,
  );
  for (let i = 0; i < 20; i++) {
    const rows = await sequelize.query<Reminder>(
      `UPDATE nexus_reminder SET state='sending', "updatedAt"=now() WHERE id=(SELECT id FROM nexus_reminder WHERE state='pending' AND "dueAt"<=now() ORDER BY "dueAt" FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
      { type: QueryTypes.SELECT },
    );
    if (!rows.length) break;
    const item = rows[0];
    try {
      await requireNexusTaskOwner(String(item.ownerChatId));
      const result = await bridgeRequest<{ sent: boolean }>(bridge, 'telegram', 'tg-nexus-reminder', {
        id: item.id,
        chatId: Number(item.ownerChatId),
        text: item.text,
      });
      await sequelize.query(
        `UPDATE nexus_reminder SET state=:state, "updatedAt"=now() WHERE id=:id AND state='sending'`,
        { replacements: { id: item.id, state: result?.sent ? 'sent' : 'uncertain' } },
      );
    } catch {
      await sequelize.query(
        `UPDATE nexus_reminder SET state='uncertain', "updatedAt"=now() WHERE id=:id AND state='sending'`,
        { replacements: { id: item.id } },
      );
    }
  }
  for (let i = 0; i < 20; i++) {
    const rows = await sequelize.query<Reminder>(
      `UPDATE nexus_reminder SET "reactionState"='sending', "reactionAttemptAt"=now(), "updatedAt"=now() WHERE id=(SELECT id FROM nexus_reminder WHERE "reactionState"='pending' AND ("reactionAttemptAt" IS NULL OR "reactionAttemptAt" < now()-interval '1 minute') ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
      { type: QueryTypes.SELECT },
    );
    if (!rows.length) break;
    const item = rows[0];
    try {
      await requireNexusTaskOwner(String(item.ownerChatId));
      const result = await bridgeRequest<{ sent: boolean }>(bridge, 'telegram', 'tg-nexus-reaction', {
        chatId: Number(item.ownerChatId),
        messageId: item.sourceMessageId,
      });
      await sequelize.query(
        `UPDATE nexus_reminder SET "reactionState"=:state, "updatedAt"=now() WHERE id=:id AND "reactionState"='sending'`,
        { replacements: { id: item.id, state: result?.sent ? 'sent' : 'pending' } },
      );
    } catch {
      await sequelize.query(
        `UPDATE nexus_reminder SET "reactionState"='pending', "updatedAt"=now() WHERE id=:id AND "reactionState"='sending'`,
        { replacements: { id: item.id } },
      );
    }
  }
}

export const newReminderId = () => randomUUID();
