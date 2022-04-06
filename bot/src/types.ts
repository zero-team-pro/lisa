import { ColorResolvable, Message, MessageAttachment, MessageEmbed } from 'discord.js';
import { Telegraf } from 'telegraf';
import { Request } from 'express';
import { createClient } from 'redis';

import { AdminUser, Server, User } from './models';
import Translation from './translation';
import { EngineList } from './constants';
import { Application } from 'express-serve-static-core';
import { Bridge } from './controllers/bridge';
import { TelegramMessage } from './controllers/telegramMessage';

export enum CommandType {
  Command = 'command',
  Ability = 'ability',
}

interface CommandTestFunction {
  (command: string): any;
}

export interface CommandAttributes {
  server?: Server;
  user?: User;
}

export enum Transport {
  Discord = 'discord',
  Telegram = 'telegram',
}

export type ExecCommand = (message: Message | TelegramMessage, t, attr: CommandAttributes) => Promise<any>;
export type ExecAbility = (
  params: any,
  bot: Telegraf<TelegramMessage>,
  t,
  redis: RedisClientType,
) => Promise<any>;

export interface CommandMap<E> {
  type: CommandType;
  title: string;
  description?: string;
  test: string | string[] | CommandTestFunction;
  exec: E;
  transports: Transport[];
}

export type RaterEngine = typeof EngineList[number];

export type RaterCostType = {
  readonly [K in RaterEngine]: number;
};

type StatKey =
  | 'hp'
  | 'hp%'
  | 'atk'
  | 'atk%'
  | 'def'
  | 'def%'
  | 'heal%'
  | 'er%'
  | 'em'
  | 'phys%'
  | 'cr%'
  | 'cd%'
  | 'elem%'
  | 'anemo%'
  | 'electro%'
  | 'pyro%'
  | 'hydro%'
  | 'cryo%'
  | 'geo%'
  | 'dendro%';

export interface RaterStat {
  key: StatKey;
  value: number;
}

export interface RaterApiReply {
  status: 'ok' | 'error' | 'image';
  level?: string;
  color?: ColorResolvable;
  score?: string;
  mainScore?: string;
  subScore?: string;
  mainStat?: RaterStat;
  stats?: RaterStat[];
  text?: string;
  image?: string;
}

interface RaterData {
  type: 'data';
  engine: RaterEngine;
  color: ColorResolvable;
  level: string;
  mainStat: RaterStat;
  stats: string[];
  score: string;
  mainScore: string;
  subScore: string;
}

interface RaterError {
  type: 'error';
  error: string;
}

interface RaterDebug {
  type: 'debug';
  embed: MessageEmbed;
  file: MessageAttachment;
}

export type RaterReply = RaterData | RaterError | RaterDebug;

interface OwnerUser {
  userId: number;
}
interface OwnerServer {
  serverId: string;
}

export type Owner = OwnerUser | OwnerServer;

export type TFunc = ReturnType<typeof Translation>;

export type ChannelType =
  | 'GUILD_TEXT'
  | 'DM'
  | 'GUILD_VOICE'
  | 'GROUP_DM'
  | 'GUILD_CATEGORY'
  | 'GUILD_NEWS'
  | 'GUILD_STORE'
  | 'GUILD_NEWS_THREAD'
  | 'GUILD_PUBLIC_THREAD'
  | 'GUILD_PRIVATE_THREAD'
  | 'GUILD_STAGE_VOICE';

/* Bot Types */

export interface BotModuleMeta {
  id: BotModuleId;
  title: string;
}

export const BotModuleIdList = ['core', 'rater', 'cms'] as const;
export type BotModuleId = typeof BotModuleIdList[number];

/* Bridge Types */

export interface IBridgeRequest {
  method: string;
  params?: any;
}

export interface IBridgeResponse {
  result: any;
  error?: IError;
}

export interface IJsonRequest extends IBridgeRequest {
  id: number;
  from: string;
}

export interface IJsonResponse extends IBridgeResponse {
  id: number;
  from: string;
}

export interface IError {
  code: number;
  message: string;
  data?: any;
}

/* API Only Types */

export interface IRequest extends Request {
  app: IApplication;
}

interface IApplication extends Application {
  settings: ISettings;
}

interface ISettings {
  bridge?: Bridge;
  redis?: RedisClientType;
}

export type RedisClientType = ReturnType<typeof createClient>;

export interface ILocals {
  userDiscordId?: string;
  adminUser?: AdminUser;
}

/* GLOBAL */

declare global {
  type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
  };
}
