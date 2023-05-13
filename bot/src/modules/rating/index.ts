import { BotModule } from '@/modules/botModule';
import { BotModuleMeta, ExecCommand, RatingData } from '@/types';
import { commandMap } from './commands';

class Rating extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'rating',
    title: 'Rating',
  };

  public commandMap = commandMap;

  public contextData: RatingData = {
    version: 2,
    messages: 0,
    characters: 0,
    reactions: 0,
    replies: 0,
    photos: 0,
  };

  constructor() {
    super(Rating.meta);
  }
}

export const RatingModule = new Rating();
