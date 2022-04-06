import { BotModule } from '../botModule';
import { commandMap } from './commands';
import { BotModuleMeta, ExecCommand } from '../../types';

class Rater extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'rater',
    title: 'Genshin Impact Artifact Rater',
  };

  public commandMap = commandMap;

  constructor() {
    super(Rater.meta);
  }
}

export const RaterModule = new Rater();
