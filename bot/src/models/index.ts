import { AdminUser, AdminUserOutlineServer, AdminUserServer } from './adminUser';
import { AICall } from './aiCall';
import { AIOwner } from './aiOwner';
import { Article } from './article';
import { Channel } from './channel';
import { Context } from './context';
import { Giveaway } from './giveaway';
import { GiveawayPrize } from './giveawayPrize';
import { GiveawayUser } from './giveawayUser';
import { sequelize } from './orm';
import { OutlineServer } from './outlineServer';
import { PaymentTransaction } from './paymentTransaction';
import { Preset } from './preset';
import { RaterCall } from './raterCall';
import { Server } from './server';
import { TelegramChat } from './telegramChat';
import { TelegramUser } from './telegramUser';
import { User } from './user';
import { VM } from './vm';

sequelize.addModels([
  AdminUser,
  AdminUserOutlineServer,
  AdminUserServer,
  AICall,
  AIOwner,
  Article,
  Channel,
  Context,
  Giveaway,
  GiveawayPrize,
  GiveawayUser,
  OutlineServer,
  PaymentTransaction,
  Preset,
  RaterCall,
  Server,
  TelegramChat,
  TelegramUser,
  User,
  VM,
]);

export {
  AdminUser,
  AdminUserOutlineServer,
  AdminUserServer,
  AICall,
  AIOwner,
  Article,
  Channel,
  Context,
  Giveaway,
  GiveawayPrize,
  GiveawayUser,
  OutlineServer,
  PaymentTransaction,
  Preset,
  RaterCall,
  sequelize,
  Server,
  TelegramChat,
  TelegramUser,
  User,
  VM,
};
