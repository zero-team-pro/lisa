import pMap from 'p-map';

import { RatingData } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';
import { calcRating } from '@/utils';

const methodName = 'rating';

const exec = async (message: BaseMessage) => {
  if (!message.isGroup) {
    return;
  }

  const contextList = await message.getAllLocalModuleData<RatingData>('rating');

  const builder = message.getMessageBuilder();

  builder.addHeader('Rating Top 10');

  const ratingContextList = contextList
    .map((context) => ({ id: context.owner, rating: calcRating(context.data) }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);

  const fieldList = await pMap(ratingContextList, async (ratingContext) => {
    const name = await message.getUserNameById(ratingContext.id);
    const rating = ratingContext.rating.toString();

    return { name, rating };
  });

  fieldList.forEach((field) => builder.addField(field.name, field.rating));

  await builder.reply();
};

export const rating = { methodName, exec };
