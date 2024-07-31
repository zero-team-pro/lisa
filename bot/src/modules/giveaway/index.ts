import { BotModule } from '@/modules/botModule';
import { BotModuleMeta, ExecCommand } from '@/types';
import { commandMap } from './commands';

class Giveaway extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'giveaway',
    title: 'Giveaway',
  };

  public commandMap = commandMap;

  constructor() {
    super(Giveaway.meta);
  }
}

export const GiveawayModule = new Giveaway();
