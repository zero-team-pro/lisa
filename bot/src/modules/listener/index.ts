import { BotModule } from '@/modules/botModule';
import { BotModuleMeta, ExecCommand } from '@/types';
import { commandMap } from './commands';

class Listener extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'listener',
    title: 'Listener',
  };

  public commandMap = commandMap;

  constructor() {
    super(Listener.meta);
  }
}

export const ListenerModule = new Listener();
