import { RatingData } from '@/types';

const RatingWeight = {
  MESSAGE: 30,
  CHARACTER: 1,
  REACTION: 5,
  REPLY: 10,
  PHOTO: 10,
};

export const calcRating = (context: RatingData) => {
  let rating = 0;

  rating += (context.messages || 0) * RatingWeight.MESSAGE;
  rating += (context.characters || 0) * RatingWeight.CHARACTER;
  rating += (context.reactions || 0) * RatingWeight.REACTION;
  rating += (context.replies || 0) * RatingWeight.REPLY;
  rating += (context.photos || 0) * RatingWeight.PHOTO;

  return rating;
};
