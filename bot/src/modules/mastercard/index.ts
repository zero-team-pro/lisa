import { BotModule } from '@/modules/botModule';
import { BotModuleMeta, ExecCommand } from '@/types';
import { commandMap } from './commands';

class Mastercard extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'mastercard',
    title: 'Mastercard',
  };

  public commandMap = commandMap;

  constructor() {
    super(Mastercard.meta);
  }
}

export const MastercardModule = new Mastercard();
