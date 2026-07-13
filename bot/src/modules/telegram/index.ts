import { BotModuleMeta, ExecAbility, ExecCommand } from '@/types';
import { BotModule } from '@/modules/botModule';
import { commandMap } from './commands';

class Telegram extends BotModule<ExecCommand | ExecAbility> {
  public static meta: BotModuleMeta = {
    id: 'telegram',
    title: 'Telegram',
  };

  public commandMap = commandMap;

  constructor() {
    super(Telegram.meta);
  }
}

export const TelegramModule = new Telegram();
