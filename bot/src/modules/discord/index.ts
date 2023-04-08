import { BotModuleMeta, ExecAbility } from '@/types';
import { BotModule } from '@/modules/botModule';
import { commandMap } from './commands';

class Discord extends BotModule<ExecAbility> {
  public static meta: BotModuleMeta = {
    id: 'discord',
    title: 'Discord',
  };

  public commandMap = commandMap;

  constructor() {
    super(Discord.meta);
  }
}

export const DiscordModule = new Discord();
