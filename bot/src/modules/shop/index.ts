import { BotModuleMeta, ExecCommand } from '@/types';
import { BotModule } from '@/modules/botModule';
import { commandMap } from './commands';

class Shop extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'shop',
    title: 'Shop',
  };

  public commandMap = commandMap;

  constructor() {
    super(Shop.meta);
  }
}

export const ShopModule = new Shop();
