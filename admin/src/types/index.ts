import React, { JSXElementConstructor } from 'react';
import { CategoryChannel, NewsChannel, StageChannel, TextChannel, VoiceChannel } from 'discord.js';

export type ViewProps<T extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>> = React.ComponentProps<T>;

export type ReduxStateWrapper<T> = {
  value: T | null;
  isLoading: boolean;
  isSending: boolean;
  error: any;
};

export type IReduxState = ReduxStateWrapper<any>;

export type PatchJson<T = any> = {
  id: string | number;
  value: T;
};

/* API */

export interface IServer {
  id: string;
  name: string;
  iconUrl?: string;
  memberCount?: number;
  prefix: string;
  lang: string;
  raterLang: string;
  mainChannelId: string;
  raterEngine: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface IChannel {
  id: string;
  name?: string;
  serverId: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  type: ChannelType;
  position?: number;
  permissionList?: string[];
  discord: TextChannel | VoiceChannel | CategoryChannel | NewsChannel | StageChannel;
}
