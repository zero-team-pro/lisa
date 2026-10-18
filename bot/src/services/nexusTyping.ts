import { Op } from 'sequelize';
import { NexusTask, NexusTaskNotification } from '@/models';
import { requireNexusTaskOwner } from './nexusTaskAuthorization';
import { isNexusChatConfigured, pruneNexusChatHistory } from './nexusChat';
import type { TelegrafBot } from '@/types';
import { Logger } from '@/controllers/logger';

// Independent of webhook request lifetime, restores itself after restart.
// One action per private chat, even when several tasks are pending.
export const tickNexusTyping = async (bot: TelegrafBot, now = new Date()) => {
  const tasks = await NexusTask.findAll({
    attributes: ['ownerChatId'],
    where: {
      source: 'telegram',
      operation: null,
      status: { [Op.in]: ['queued', 'leased'] },
      createdAt: { [Op.gte]: new Date(now.getTime() - 45 * 60_000) },
    },
  });
  const pending = await NexusTaskNotification.findAll({
    attributes: ['ownerChatId', 'replyToMessageId'],
    include: [{ model: NexusTask, attributes: [], required: true, where: { operation: null } }],
    where: { deliveredAt: null, createdAt: { [Op.gte]: new Date(now.getTime() - 45 * 60_000) } },
  });
  const owners = new Set([
    ...tasks.map((task) => task.ownerChatId),
    ...pending.filter((item) => item.replyToMessageId).map((item) => item.ownerChatId),
  ]);
  for (const owner of owners) {
    if (!isNexusChatConfigured(String(owner))) continue;
    try {
      await requireNexusTaskOwner(String(owner));
      await bot.telegram.sendChatAction(Number(owner), 'typing');
    } catch {
      /* Fail closed; transient transport errors retry on the next tick. */
    }
  }
};

export const startNexusTyping = (bot: TelegrafBot) => {
  let busy = false;
  let lastPruneAt = 0;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      if (Date.now() - lastPruneAt > 15 * 60_000) {
        await pruneNexusChatHistory();
        lastPruneAt = Date.now();
      }
      await tickNexusTyping(bot);
    } catch {
      Logger.warn('Nexus typing state unavailable', {}, 'Tasks');
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void tick(), 4000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
};
