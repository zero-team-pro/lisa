import { BotModule } from '@/modules/botModule';
import { BotModuleMeta, ExecCommand, MastercardData } from '@/types';
import { commandMap } from './commands';

class Mastercard extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'mastercard',
    title: 'Mastercard',
  };

  public commandMap = commandMap;

  public contextData: MastercardData = {
    version: 1,
    cardCurr: 'USD',
    transCurr: null,
    bankFee: 0,
  };

  constructor() {
    super(Mastercard.meta);
  }
}

export const MastercardModule = new Mastercard();
