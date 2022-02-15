import { BotModule } from '../botModule';
import { commandMap } from './commands';
import { BotModuleMeta } from '../../types';

export class Rater extends BotModule {
  public static meta: BotModuleMeta = {
    id: 'rater',
    title: 'Genshin Impact Artifact Rater',
  };

  public commandMap = commandMap;

  constructor() {
    super(Rater.meta);
  }
}
