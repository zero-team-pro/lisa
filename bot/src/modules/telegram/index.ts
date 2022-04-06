import { BotModule } from '../botModule';
import { commandMap } from './commands';
import { BotModuleMeta, ExecCommand } from '../../types';

class Telegram extends BotModule<ExecCommand> {
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
