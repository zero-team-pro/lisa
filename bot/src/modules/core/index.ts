import { BotModuleMeta, ExecCommand } from '@/types';
import { BotModule } from '@/modules/botModule';
import { commandMap } from './commands';

class Core extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'core',
    title: 'Core',
  };

  public commandMap = commandMap;

  constructor() {
    super(Core.meta);
  }
}

export const CoreModule = new Core();
