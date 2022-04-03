import {
  Table,
  Column,
  Model,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  Default,
  AllowNull,
  Index,
  AutoIncrement,
  HasMany,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

import { Server } from './server';
import { Preset } from './preset';
import { Language } from '../constants';
import { AdminUser, RaterCall } from './index';
import { RaterEngine } from '../types';

interface UserAttributes {
  id: number;
  discordId: string;
  server: Server;
  serverId: string;
  isAdmin: boolean;
  isBlocked: boolean;
  lang: Language;
  raterLang: Language;
  raterLimit: number;
  raterEngine: RaterEngine;
  createdAt: Date;
  updatedAt: Date;
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'id'
    | 'server'
    | 'isAdmin'
    | 'isBlocked'
    | 'lang'
    | 'raterLang'
    | 'raterLimit'
    | 'raterEngine'
    | 'createdAt'
    | 'updatedAt'
  > {}

@Table({ tableName: 'telegram_user' })
export class TelegramUser extends Model<UserAttributes, UserCreationAttributes> {
  @PrimaryKey
  @Column
  id: number;

  @Column
  username: string;

  @Column
  avatarUrl: string;

  @Column
  lang: Language;

  @BelongsTo(() => AdminUser)
  admin: AdminUser;

  @ForeignKey(() => AdminUser)
  @Column
  adminId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
