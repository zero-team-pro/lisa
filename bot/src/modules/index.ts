import { BotModule } from './botModule';
import { CoreModule } from './core';
import { RaterModule } from './rater';
import { CmsModule } from './cms';
import { DiscordModule } from './discord';
import { TelegramModule } from './telegram';
import { ShopModule } from './shop';
import { MastercardModule } from './mastercard';

export * from './botModule';

export { CoreModule, RaterModule, CmsModule, DiscordModule, TelegramModule, ShopModule, MastercardModule };

export const ModuleList: BotModule<any>[] = [
  CoreModule,
  RaterModule,
  CmsModule,
  DiscordModule,
  TelegramModule,
  ShopModule,
  MastercardModule,
];
