import { Transport } from '@/types';
import { requireNexusTelegram } from '@/services/nexusChat';
import type { TelegramMessage } from '@/controllers/telegram/telegramMessage';
import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'mode';

// TODO: Move to constants
const allowedModes = ['lisa', 'nexus'];

// TODO: i18n
const exec = async (message: BaseMessage) => {
  const [, param] = message.content.trim().split(/\s+/);

  if (!param) {
    return message.reply(`Mode: ${message.mode}`);
  }

  if (param === 'exit') {
    if (!(await message.setMode(null))) return message.reply('Не удалось сохранить режим.');
    return message.reply('Exit from mode.');
  }

  if (allowedModes.includes(param)) {
    if (param === 'nexus') {
      if (message.transport !== Transport.Telegram)
        return message.reply('Nexus доступен только в личном чате Telegram.');
      try {
        await requireNexusTelegram(message as TelegramMessage);
      } catch {
        return message.reply('Nexus доступен только globalAdmin в разрешённом личном чате.');
      }
    }
    if (!(await message.setMode(param))) return message.reply('Не удалось сохранить режим.');
    return message.reply('Mode set!');
  } else {
    return message.reply('Unknown mode.');
  }
};

export const mode = { exec, methodName };
