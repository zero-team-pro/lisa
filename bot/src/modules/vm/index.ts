import { BotModuleMeta, ExecAbility, ExecCommand, VMExecParams } from '@/types';
import { BotModule } from '@/modules/botModule';

import { apiMethods, commandMap } from './commands';

class VM extends BotModule<ExecCommand | ExecAbility<VMExecParams | null>> {
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
