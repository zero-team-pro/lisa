import { ColorResolvable } from 'discord.js';

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
