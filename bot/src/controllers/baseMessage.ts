import { Message } from 'discord.js';
import { Telegram } from 'telegraf';

import { AdminUser, TelegramUser, User } from '@/models';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { BotModuleId, ContextData, Transport } from '@/types';

export interface BaseMessage {
  get transport(): Transport;
  get raw(): Message<boolean> | Telegram;
  get content(): string;

  reply(text: string): Promise<any>;
  getMessageBuilder(): MessageBuilder;
  setModule(moduleId: BotModuleId): void;
  getModuleData<T extends ContextData>(): Promise<T>;
  setModuleData<T extends ContextData>(data: T): Promise<T>;
  setModuleDataPartial<T extends ContextData>(data: Partial<T>): Promise<T>;

  getUser(): Promise<TelegramUser | User | null>;
  getAdmin(): Promise<AdminUser | null>;
}
