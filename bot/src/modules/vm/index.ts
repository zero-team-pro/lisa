import { BotModuleMeta, ExecAbility, VMConfig } from '@/types';
import { BotModule } from '@/modules/botModule';

import { apiMethods, commandMap } from './commands';

class VM extends BotModule<ExecAbility<VMConfig>> {
  public static meta: BotModuleMeta = {
    id: 'vm',
    title: 'VM',
  };

  public api = apiMethods;

  public commandMap = commandMap;

  constructor() {
    super(VM.meta);
  }
}

export const VMModule = new VM();
