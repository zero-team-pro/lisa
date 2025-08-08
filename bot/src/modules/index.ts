import { BotModule } from './botModule';
import { CoreModule } from './core';
import { RaterModule } from './rater';
import { CmsModule } from './cms';
import { DiscordModule } from './discord';
import { TelegramModule } from './telegram';
import { ShopModule } from './shop';
import { MastercardModule } from './mastercard';
import { ListenerModule } from './listener';
import { RatingModule } from './rating';
import { OpenAIModule } from './openai';
import { OpenAIToolsModule } from './tools';
import { VMModule } from './vm';
import { GiveawayModule } from './giveaway';

export * from './botModule';

export {
  CoreModule,
  RaterModule,
  CmsModule,
  DiscordModule,
  TelegramModule,
  ShopModule,
  MastercardModule,
  ListenerModule,
  RatingModule,
  OpenAIModule,
  OpenAIToolsModule,
  VMModule,
  GiveawayModule,
};

export const ModuleList: BotModule<any>[] = [
  CoreModule,
  RaterModule,
  CmsModule,
  DiscordModule,
  TelegramModule,
  ShopModule,
  MastercardModule,
  ListenerModule,
  RatingModule,
  OpenAIModule,
  OpenAIToolsModule,
  VMModule,
  GiveawayModule,
];

export const CommandList = ModuleList.map((module) => module.commandMap)
  .flat()
  .sort((a, b) => a.priority - b.priority);
