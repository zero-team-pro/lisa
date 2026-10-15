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
import { NexusChatMessage } from './nexusChatMessage';
import { NexusTask } from './nexusTask';
import { NexusTaskAttempt } from './nexusTaskAttempt';
import { NexusTaskNotification } from './nexusTaskNotification';
import { NexusTaskRequest } from './nexusTaskRequest';
import { Preset } from './preset';
import { RaterCall } from './raterCall';
import { Server } from './server';
import { TelegramChat } from './telegramChat';
import { TelegramUser } from './telegramUser';
import { DiscordUser } from './user';
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
  NexusChatMessage,
  NexusTask,
  NexusTaskAttempt,
  NexusTaskNotification,
  NexusTaskRequest,
  Preset,
  RaterCall,
  Server,
  TelegramChat,
  TelegramUser,
  DiscordUser,
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
  NexusChatMessage,
  NexusTask,
  NexusTaskAttempt,
  NexusTaskNotification,
  NexusTaskRequest,
  Preset,
  RaterCall,
  sequelize,
  Server,
  TelegramChat,
  TelegramUser,
  DiscordUser,
  VM,
};
