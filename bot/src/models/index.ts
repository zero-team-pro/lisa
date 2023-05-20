import { sequelize } from './orm';
import { Server } from './server';
import { Channel } from './channel';
import { User } from './user';
import { Preset } from './preset';
import { RaterCall } from './raterCall';
import { AdminUser, AdminUserServer, AdminUserOutlineServer } from './adminUser';
import { TelegramUser } from './telegramUser';
import { TelegramChat } from './telegramChat';
import { Article } from './article';
import { OutlineServer } from './outlineServer';
import { Context } from './context';
import { AICall } from './aiCall';
import { AIOwner } from './aiOwner';
import { PaymentTransaction } from './paymentTransaction';

sequelize.addModels([
  Server,
  Channel,
  User,
  Preset,
  RaterCall,
  AdminUser,
  AdminUserServer,
  AdminUserOutlineServer,
  TelegramUser,
  TelegramChat,
  Article,
  OutlineServer,
  Context,
  AICall,
  AIOwner,
  PaymentTransaction,
]);

export {
  sequelize,
  Server,
  Channel,
  User,
  Preset,
  RaterCall,
  AdminUser,
  AdminUserServer,
  AdminUserOutlineServer,
  TelegramUser,
  TelegramChat,
  Article,
  OutlineServer,
  Context,
  AICall,
  AIOwner,
  PaymentTransaction,
};
