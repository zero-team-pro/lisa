import { ColorResolvable, Message, MessageAttachment, MessageEmbed } from 'discord.js';

import { Server, User } from './models';
import Translation from './translation';
import { EngineList } from './constants';

interface CommandTestFunction {
  (command: string): any;
}

export interface CommandAttributes {
  server?: Server;
  user?: User;
}

export interface CommandMap {
  test: string | string[] | CommandTestFunction;
  exec(message: Message, t, attr: CommandAttributes): Promise<any>;
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

/* API Only Types */

export interface Locals {
  users?: User[];
}

/* GLOBAL */

declare global {
  type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
  };
}
