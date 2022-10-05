import { BotModule } from './botModule';
import { CoreModule } from './core';
import { RaterModule } from './rater';
import { CmsModule } from './cms';
import { TelegramModule } from './telegram';
import { ShopModule } from './shop';

export * from './botModule';

export { CoreModule, RaterModule, CmsModule, TelegramModule, ShopModule };

export const ModuleList: BotModule<any>[] = [CoreModule, RaterModule, CmsModule, TelegramModule, ShopModule];
