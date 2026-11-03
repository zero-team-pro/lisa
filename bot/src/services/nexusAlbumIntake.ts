import { QueryTypes } from 'sequelize';
import { sequelize } from '@/models';
import type { Message } from 'telegraf/types';

export const ALBUM_QUIET_MS = 2000;
export const ALBUM_MAX_MS = 10_000;
interface AlbumRow {
  ownerChatId: string;
  mediaGroupId: string;
  state: string;
  messages: Array<{ message: Message; rejected?: boolean }>;
  firstAt: Date;
  lastAt: Date;
}
export const albumDue = (firstAt: number, lastAt: number, now: number) =>
  now - lastAt >= ALBUM_QUIET_MS || now - firstAt >= ALBUM_MAX_MS;

// Only authorized private chats enter this service. Persist original Telegram
// message data, never a Context, bot client or credential-bearing file URL.
export const collectNexusAlbum = async (
  ownerChatId: string,
  mediaGroupId: string,
  message: Message,
): Promise<'collected' | 'duplicate' | 'late'> =>
  sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `INSERT INTO nexus_album_intake ("ownerChatId", "mediaGroupId", state, "firstAt", "lastAt", messages, "updatedAt") VALUES (:ownerChatId, :mediaGroupId, 'collecting', now(), now(), '[]'::jsonb, now()) ON CONFLICT DO NOTHING`,
      { replacements: { ownerChatId, mediaGroupId }, transaction },
    );
    const rows = await sequelize.query<AlbumRow>(
      'SELECT * FROM nexus_album_intake WHERE "ownerChatId"=:ownerChatId AND "mediaGroupId"=:mediaGroupId FOR UPDATE',
      { replacements: { ownerChatId, mediaGroupId }, type: QueryTypes.SELECT, transaction },
    );
    const row = rows[0];
    if (row.messages.some((item) => item.message.message_id === message.message_id)) return 'duplicate';
    const late = row.state !== 'collecting';
    // Bounded rejected metadata prevents one malicious album growing forever.
    if (row.messages.length < 30)
      await sequelize.query(
        'UPDATE nexus_album_intake SET messages=CAST(:messages AS jsonb), "lastAt"=now(), "updatedAt"=now() WHERE "ownerChatId"=:ownerChatId AND "mediaGroupId"=:mediaGroupId',
        {
          replacements: {
            ownerChatId,
            mediaGroupId,
            messages: JSON.stringify([...row.messages, { message, ...(late ? { rejected: true } : {}) }]),
          },
          transaction,
        },
      );
    return late ? 'late' : 'collected';
  });

export const flushNexusAlbums = async (finalize: (row: AlbumRow) => Promise<void | boolean>) => {
  for (let count = 0; count < 20; count++) {
    const row = await sequelize.transaction(async (transaction) => {
      const rows = await sequelize.query<AlbumRow>(
        `SELECT * FROM nexus_album_intake WHERE (state='collecting' AND ("lastAt" <= now()-interval '2 seconds' OR "firstAt" <= now()-interval '10 seconds')) OR (state='finalizing' AND "updatedAt" <= now()-interval '5 minutes') ORDER BY "firstAt" FOR UPDATE SKIP LOCKED LIMIT 1`,
        { type: QueryTypes.SELECT, transaction },
      );
      if (!rows[0]) return null;
      await sequelize.query(
        `UPDATE nexus_album_intake SET state='finalizing', "updatedAt"=now() WHERE "ownerChatId"=:ownerChatId AND "mediaGroupId"=:mediaGroupId`,
        { replacements: { ownerChatId: rows[0].ownerChatId, mediaGroupId: rows[0].mediaGroupId }, transaction },
      );
      return rows[0];
    });
    if (!row) return;
    try {
      const accepted = await finalize(row);
      // Nexus task creation finalizes in its transaction. This update also
      // settles ordinary albums and bounded rejected intake without a task.
      await sequelize.query(
        `UPDATE nexus_album_intake SET state=:state, "updatedAt"=now() WHERE "ownerChatId"=:ownerChatId AND "mediaGroupId"=:mediaGroupId AND state='finalizing'`,
        {
          replacements: {
            ownerChatId: row.ownerChatId,
            mediaGroupId: row.mediaGroupId,
            state: accepted === false ? 'failed' : 'finalized',
          },
        },
      );
    } catch {
      // Leave finalizing for recovery after a bounded backoff. Never log a raw
      // provider exception: it can embed the Telegram download credential.
      return;
    }
  }
};
