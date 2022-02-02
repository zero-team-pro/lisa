import React, { JSXElementConstructor } from 'react';

export type ViewProps<T extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>> = React.ComponentProps<T>;

export type ReduxStateWrapper<T> = {
  value: T | null;
  isLoading: boolean;
  error: any;
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
