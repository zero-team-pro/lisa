import { RatingData, TFunc } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'listen';

const exec = async (message: BaseMessage, t: TFunc) => {
  if (!message.isGroup) {
    return;
  }

  const context = await message.getLocalModuleData<RatingData>('rating');

  // TODO: Proceed reactions and replies

  context.messages++;

  if (message.photo) {
    context.photos++;
  }

  const characters = message.content.length;
  if (typeof characters === 'number' && !isNaN(characters)) {
    context.characters += characters;
  }

  await message.setLocalModuleData<RatingData>('rating', context);
};

export const listen = { methodName, exec };
