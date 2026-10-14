import { AdminUser, TelegramUser } from '@/models';
import type { NexusTaskActor } from '@/models/nexusTaskRequest';

export class NexusTaskForbiddenError extends Error {}

// Task content and results must never enter a shared chat. Machine credentials
// are scoped to the private Telegram identity of a current global administrator.
export const requireNexusTaskOwner = async (chatId: string): Promise<AdminUser> => {
  if (!/^[1-9]\d*$/.test(chatId) || !Number.isSafeInteger(Number(chatId))) {
    throw new NexusTaskForbiddenError('A globalAdmin private chat is required');
  }
  const user = await TelegramUser.findByPk(chatId, { include: [AdminUser] });
  if (!user?.admin || user.admin.role !== 'globalAdmin') {
    throw new NexusTaskForbiddenError('A linked globalAdmin is required');
  }
  return user.admin;
};

export const isAuthorizedTaskCreator = (actor: NexusTaskActor | null, ownerChatId: string, adminId: number): boolean =>
  Boolean(
    actor &&
      actor.adminUserId === adminId &&
      ((actor.type === 'telegram' && actor.telegramUserId === ownerChatId) ||
        (actor.type === 'api' && typeof actor.apiTokenHash === 'string' && /^[a-f0-9]{64}$/.test(actor.apiTokenHash))),
  );
