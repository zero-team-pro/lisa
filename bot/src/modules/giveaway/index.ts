import { BotModule } from '@/modules/botModule';
import { BotModuleMeta, CronAbility, ExecCommand, TelegrafBot } from '@/types';
import { commandMap } from './commands';

class Giveaway extends BotModule<ExecCommand | CronAbility<TelegrafBot>> {
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
