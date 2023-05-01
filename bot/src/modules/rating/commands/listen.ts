import { RatingData, TFunc, Transport } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'listen';

const shouldProcess = (message: BaseMessage) => {
  if (message.transport === Transport.Telegram) {
    const telegramMessage = (message as BaseMessage<Transport.Telegram>).raw;

    if (telegramMessage.chat.type === 'group') {
      return true;
    }
  }

  return false;
};

const exec = async (message: BaseMessage, t: TFunc) => {
  // Proceed only Groups
  if (!shouldProcess(message)) {
    return;
  }

  const context = await message.getLocalModuleData<RatingData>('rating');

  // TODO: Proceed reactions and replies

  context.messages++;

  const characters = message.content.length;
  if (typeof characters === 'number' && !isNaN(characters)) {
    context.characters += characters;
  }

  await message.setLocalModuleData<RatingData>('rating', context);
};

export const listen = { methodName, exec };
