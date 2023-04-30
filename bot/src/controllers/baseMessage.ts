import { Message } from 'discord.js';
import { Telegram } from 'telegraf';

import { AdminUser, TelegramUser, User } from '@/models';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { Transport } from '@/types';

export interface BaseMessage {
  get transport(): Transport;
  get raw(): Message<boolean> | Telegram;
  get content(): string;

  reply(text: string): Promise<any>;
  getMessageBuilder(): MessageBuilder;

  getUser(): Promise<TelegramUser | User | null>;
  getAdmin(): Promise<AdminUser | null>;
}
