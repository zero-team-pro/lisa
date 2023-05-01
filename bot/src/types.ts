import { AttachmentBuilder, ColorResolvable, EmbedBuilder, Message } from 'discord.js';
import { Telegraf } from 'telegraf';
import { Request } from 'express';
import { createClient } from 'redis';
import * as tg from 'telegraf/typings/core/types/typegram';

import { AdminUser, Server, User } from './models';
import { Translation } from './translation';
import { EngineList } from './constants';
import { Application } from 'express-serve-static-core';
import { Bridge } from './controllers/bridge';
import { TelegramMessage } from './controllers/telegramMessage';
import { DiscordMessage } from '@/controllers/discordMessage';

export type TFunc = ReturnType<typeof Translation>;

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

export type TelegrafBot = Telegraf;
export type ExecCommand = (
  message: DiscordMessage | TelegramMessage,
  t: TFunc,
  attr: CommandAttributes,
) => Promise<any>;
export type ExecAbility<T = TelegrafBot> = (params: any, bot: T, redis: RedisClientType) => Promise<any>;

export interface CommandMap<E> {
  type: CommandType;
  title: string;
  description: string;
  test: string | string[] | CommandTestFunction;
  exec: E;
  transports: Transport[];
}

export type UserProfilePhotos = tg.UserProfilePhotos;
export type PhotoSize = tg.PhotoSize;

export enum ArticleType {
  Post = 'Post',
}

export enum ArticleStatus {
  Draft = 'Draft',
  Queue = 'Queue',
  Sending = 'Sending',
  Done = 'Done',
}

export enum EditorTextType {
  Paragraph = 'paragraph',
}

export interface EditorNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
}

export interface EditorText {
  type: EditorTextType;
  children: EditorNode[];
}

/* Rater Types */

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
  embed: EmbedBuilder;
  file: AttachmentBuilder;
}

export type RaterReply = RaterData | RaterError | RaterDebug;

interface OwnerUser {
  userId: number;
}
interface OwnerServer {
  serverId: string;
}

export type Owner = OwnerUser | OwnerServer;

/* Bot Types */

export interface BotModuleMeta {
  id: BotModuleId;
  title: string;
}

export const BotModuleIdList = ['core', 'rater', 'cms', 'discord', 'telegram', 'shop', 'mastercard'] as const;
export type BotModuleId = typeof BotModuleIdList[number];

export type OwnerType = 'adminUser' | 'discordUser' | 'discordServer' | 'telegramUser' | 'telegramChat';
export const DataOwner: Record<OwnerType, OwnerType> = {
  adminUser: 'adminUser',
  discordUser: 'discordUser',
  discordServer: 'discordServer',
  telegramUser: 'telegramUser',
  telegramChat: 'telegramChat',
};

export interface ContextData {
  version: number;
}

export interface MastercardData extends ContextData {
  version: 1;

  /** Default: `USD` */
  cardCurr: string;
}

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

/* Outline VPN */

export interface ApiOutlineServer {
  name: string;
  serverId: string;
  metricsEnabled: boolean;
  createdTimestampMs: number;
  version: string;
  accessKeyDataLimit: {
    bytes: number;
  };
  portForNewAccessKeys: number;
  hostnameForAccessKeys: string;
}

export interface ApiOutlineAccessKeys {
  accessKeys: {
    id: string;
    name: string;
    password: string;
    port: number;
    method: string;
    dataLimit: {
      bytes: number;
    };
    accessUrl: string;
  };
}

export interface ApiOutlineTransfer {
  bytesTransferredByUserId: Record<string, number>;
}

/* Mastercard */

export type MastercardApiConversionRateRequest = {
  /** Date of transaction. Example: 2023-04-28  */
  fxDate: string;

  /** Card account currency. Example: USD */
  crdhldBillCurr: string;

  /** Transaction currency. Example: KZT */
  transCurr: string;

  /** Transaction amount. Example: 4990 */
  transAmt: string;

  /** Bank fee. Example: 0 */
  bankFee: string;
};

export interface MastercardConversionRate {
  name: 'settlement-conversion-rate';
  description: 'Settlement conversion rate and billing amount';

  /** Date of request. Example: '2023-04-28 18:13:08' */
  date: string;

  /** Example: 'error' */
  type?: string;

  data: {
    /** Conversion rate. Example: 0.0021207 */
    conversionRate: number;

    /** Billed from bank account in account currency. Example: 10.582293 */
    crdhldBillAmt: number;

    /** Date of transaction. Example: 2023-04-28 */
    fxDate: '2023-04-28';

    /** Transaction currency. Example: KZT */
    transCurr: string;

    /** Card account currency. Example: USD */
    crdhldBillCurr: string;

    /** Transaction amount. Example: 4990 */
    transAmt: number;

    /** Error code associated with the error being returned. Example: 104 */
    errorCode?: string;

    /** The reason for the error. */
    errorMessage?: string;
  };
}

/* GLOBAL */

declare global {
  type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
  };
}
