import { RatingData } from '@/types';

const RatingWeight = {
  MESSAGE: 30,
  CHARACTER: 1,
  REACTION: 5,
  REPLY: 10,
};

export const calcRating = (context: RatingData) => {
  let rating = 0;

  rating += context.messages * RatingWeight.MESSAGE;
  rating += context.characters * RatingWeight.CHARACTER;
  rating += context.reactions * RatingWeight.REACTION;
  rating += context.replies * RatingWeight.REPLY;

  return rating;
};
