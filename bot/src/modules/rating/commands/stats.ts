import { RatingData } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';
import { calcRating } from '@/utils';

const methodName = 'stats';

const exec = async (message: BaseMessage) => {
  if (!message.isGroup) {
    return;
  }

  const context = await message.getLocalModuleData<RatingData>('rating');

  const ratingFields = { ...context, rating: calcRating(context).toString() };

  const builder = message.getMessageBuilderOld();

  builder.addHeader('Your rating stats');
  builder.addObject(ratingFields);

  await builder.reply();
};

export const stats = { methodName, exec };
