import pMap from 'p-map';

import { RatingData } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'stats';

const RatingWeight = {
  MESSAGE: 10,
  CHARACTER: 1,
  REACTION: 5,
  REPLY: 3,
};

function calcRating(context: RatingData) {
  let rating = 0;

  rating += context.messages * RatingWeight.MESSAGE;
  rating += context.characters * RatingWeight.CHARACTER;
  rating += context.reactions * RatingWeight.REACTION;
  rating += context.replies * RatingWeight.REPLY;

  return rating;
}

const exec = async (message: BaseMessage) => {
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

export const stats = { methodName, exec };
