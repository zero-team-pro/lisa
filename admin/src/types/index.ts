import React, { JSXElementConstructor } from 'react';
import { CategoryChannel, NewsChannel, StageChannel, TextChannel, VoiceChannel } from 'discord.js';

export type ViewProps<T extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>> = React.ComponentProps<T>;

export type ReduxStateWrapper<T> = {
  value: T | null;
  isLoading: boolean;
  isLoaded: boolean;
  isSending: boolean;
  isSent: boolean;
  error: any;
};

export type IReduxState = ReduxStateWrapper<any>;

export type PatchJson<T = any> = {
  guildId?: string;
  id: string | number;
  value: T;
};

export type PostJson<T = any> = {
  id?: string | number;
  value?: T;
};

export enum EditorTextType {
  Paragraph = 'paragraph',
}

export interface IEditorNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
}

export interface IEditorText {
  type: EditorTextType;
  children: IEditorNode[];
}

/* API */

export type LanguageType = 'en' | 'ru';

export interface IAdmin {
  id: number;
  discordId?: string;
  serverList?: Array<IServer>;
  role: string;
  lang: LanguageType | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IServer {
  id: string;
  name: string;
  iconUrl?: string;
  memberCount?: number;
  localUserCount: number;
  prefix: string;
  lang: LanguageType;
  raterLang: LanguageType;
  mainChannelId: string;
  raterEngine: string;
  modules: string[];
  adminUserList: AdminUser[];
  shardId: number;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: number;
  discordId: string;
  role: string;
  name?: string;
  iconUrl?: string;
  isGuildAdmin?: boolean;
}

export enum ChannelType {
  GuildText = 0,
  DM = 1,
  GuildVoice = 2,
  GroupDM = 3,
  GuildCategory = 4,
  GuildAnnouncement = 5,
  AnnouncementThread = 10,
  PublicThread = 11,
  PrivateThread = 12,
  GuildStageVoice = 13,
  GuildDirectory = 14,
  GuildForum = 15,
  GuildNews = 5,
  GuildNewsThread = 10,
  GuildPublicThread = 11,
  GuildPrivateThread = 12,
}

// TODO: ChannelType
interface AnyRecord extends Record<string, any> {}

export const ChannelTypeMap: AnyRecord = {
  0: 'Guild Text',
  1: 'DM',
  2: 'Guild Voice',
  3: 'Group DM',
  4: 'Guild Category',
  5: 'Guild Announcement or News',
  10: 'Announcement or News Thread',
  11: 'Public Thread',
  12: 'Private Thread',
  13: 'Guild Stage Voice',
  14: 'Guild Directory',
  15: 'Guild Forum',
};

export interface IChannel {
  id: string;
  name?: string;
  serverId: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  type?: ChannelType;
  position?: number;
  permissionList?: string[];
  discord: TextChannel | VoiceChannel | CategoryChannel | NewsChannel | StageChannel;
}

export type ITelegramChatType = 'private' | 'group' | 'supergroup' | 'channel';

export interface ITelegramChat {
  id: string;
  type: ITelegramChatType;
  username?: string;
  title?: string;
  description?: string;
  photoUrl?: string;
  lang?: LanguageType;
  admin?: AdminUser;
  adminId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITelegramUser {
  id: number;
  username?: string;
  avatarUrlSmall?: string;
  avatarUrlBig?: string;
  lang?: LanguageType;
  admin?: AdminUser;
  adminId: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum ArticleType {
  Post = 'Post',
}

export enum ArticleStatus {
  Draft = 'Draft',
  Queue = 'Queue',
  Sending = 'Sending',
  Done = 'Done',
}

export interface IArticle {
  id: number;
  transport: Transport;
  type: ArticleType;
  status: ArticleStatus;
  title?: string;
  text?: string;
  admin?: AdminUser;
  adminId: number;
  chat?: ITelegramChat;
  chatId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum CommandType {
  Command = 'command',
  Ability = 'ability',
}

export enum Transport {
  Discord = 'discord',
  Telegram = 'telegram',
}

export interface ICommand {
  type: CommandType;
  title: string;
  description?: string;
  transports: Transport[];
  help: string;
}

export interface IModule {
  id: string;
  title: string;
  iconUrl?: string;
  commandList: ICommand[];
}

export interface IOutlineServer {
  id: number;
  name: string;
  externalId: string;
  serverId: string;
  metricsEnabled: boolean;
  createdTimestampMs: number;
  version: string;
  accessKeyDataLimit?: {
    bytes: number;
  };
  portForNewAccessKeys: number;
  hostnameForAccessKeys: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOutlineClient {
  id: string;
  name: string;
  password: string;
  port: number;
  method: string;
  dataLimit?: {
    bytes: number;
  };
  accessUrl: string;
  transfer: number;
}
