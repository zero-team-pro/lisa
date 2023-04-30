import { TFunc } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'lisa';

const exec = async (message: BaseMessage, t: TFunc) => {
  const messageParts = message.content.split(' ');
  if (messageParts.length === 1) {
    await message.reply(t('lisa.listening'));
    return;
  }
};

export const lisa = { exec, methodName };
