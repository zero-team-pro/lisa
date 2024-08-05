import pMap from 'p-map';

import { RatingData } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';
import { calcRating, numberToKk } from '@/utils';

const methodName = 'rating';

const exec = async (message: BaseMessage) => {
  if (!message.isGroup) {
    return;
  }

  const contextList = await message.getAllLocalModuleData<RatingData>('rating');

  const builder = message.getMessageBuilderOld();

  builder.addHeader('Rating Top 10');

  const ratingContextList = contextList
    .map((context) => ({ id: context.owner, rating: calcRating(context.data) }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);

  const t0 = performance.now();
  const fieldList = await pMap(ratingContextList, async (ratingContext) => {
    const name = await message.getUserNameById(ratingContext.id);
    const rating = numberToKk(ratingContext.rating);

    return { name, rating };
  });
  const t1 = performance.now();
  console.log(`Rating name requesting took ${(t1 - t0).toFixed(0)} ms.`);

  fieldList.forEach((field) => builder.addFieldReverse(field.name, field.rating));

  await builder.reply();
};

export const rating = { methodName, exec };
