import { BotModule } from './botModule';
import { CoreModule } from './core';
import { RaterModule } from './rater';
import { CmsModule } from './cms';
import { TelegramModule } from './telegram';

export * from './botModule';

export { CoreModule, RaterModule, CmsModule, TelegramModule };

export const ModuleList: BotModule<any>[] = [CoreModule, RaterModule, CmsModule, TelegramModule];
