import { ColorResolvable, Message } from 'discord.js';
import { Server, User } from './models';

interface CommandTestFunction {
  (command: string): any;
}

export interface CommandAttributes {
  server?: Server;
  user?: User;
}

export interface CommandMap {
  test: string | string[] | CommandTestFunction;
  exec(command: string, message: Message, attr: CommandAttributes): Promise<any>;
}

export interface IRaterEmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export interface IRaterReply {
  type: 'text' | 'embed';
  text?: string;
  title?: string;
  description?: string;
  color?: ColorResolvable;
  fields?: IRaterEmbedField[];
}

interface OwnerUser {
  userId: number;
}
interface OwnerServer {
  serverId: string;
}

export type Owner = OwnerUser | OwnerServer;
