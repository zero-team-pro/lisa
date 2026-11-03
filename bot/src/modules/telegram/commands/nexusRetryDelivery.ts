import type { TelegramMessage } from '@/controllers/telegram/telegramMessage';
import { requireNexusTelegram } from '@/services/nexusChat';
import { retryNexusDelivery } from '@/services/nexusFileDelivery';
const pattern = /^\/nexus_resend(?:@\w+)?\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i;
export const nexusRetryDelivery = {
  methodName: 'nexus-resend',
  test: (message: TelegramMessage) => /^\/nexus_resend(?:@\w+)?(?:\s|$)/i.test(message.content),
  exec: async (message: TelegramMessage) => {
    message.markProcessed();
    try {
      await requireNexusTelegram(message);
      const match = message.content.match(pattern);
      if (!match) {
        await message.reply(
          'Используй /nexus_resend <ID задачи>. Повторная отправка неподтверждённого файла может создать дубликат.',
        );
        return;
      }
      await retryNexusDelivery(message.chatId, match[1]);
      await message.reply(
        'Доставка поставлена на повтор. Неподтверждённое сообщение или файл может прийти дважды. Задача заново не выполняется.',
      );
    } catch {
      await message.reply('Повторная доставка недоступна.');
    }
  },
};
