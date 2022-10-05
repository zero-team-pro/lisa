import { BotModule } from '../botModule';
import { commandMap } from './commands';
import { BotModuleMeta, ExecCommand } from '../../types';

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
