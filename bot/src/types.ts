import { ColorResolvable, Message } from 'discord.js';

import { Server, User } from './models';
import Translation from './translation';

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

interface IRaterStat {
  key: string;
  value: number;
}

export interface IRaterReply {
  status: 'ok' | 'error';
  level?: string;
  color?: ColorResolvable;
  score?: string;
  mainScore?: string;
  subScore?: string;
  mainStat?: IRaterStat;
  stats?: IRaterStat[];
  text?: string;
}

interface OwnerUser {
  userId: number;
}
interface OwnerServer {
  serverId: string;
}

export type Owner = OwnerUser | OwnerServer;

export type TFunc = ReturnType<typeof Translation>;

declare global {
  type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
  };
}
