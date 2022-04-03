import {
  Table,
  Column,
  Model,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  ForeignKey,
  Default,
  AllowNull,
  Index,
  AutoIncrement,
  BelongsToMany,
  HasMany,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

import { Server } from './server';
import { Language } from '../constants';
import { TelegramUser } from './telegramUser';

interface AdminUserAttributes {
  id: number;
  discordId: string;
  serverList: Array<Server>;
  role: string;
  lang: Language;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminUserCreationAttributes
  extends Optional<AdminUserAttributes, 'id' | 'serverList' | 'role' | 'lang' | 'createdAt' | 'updatedAt'> {}

@Table({ tableName: 'admin_user' })
export class AdminUser extends Model<AdminUserAttributes, AdminUserCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Index
  @Column
  discordId: string;

  @BelongsToMany(() => Server, () => AdminUserServer)
  serverList: Array<Server>;

  @AllowNull(false)
  @Default('user')
  @Column
  role: string;

  @Column
  lang: Language;

  @HasMany(() => TelegramUser)
  telegramUserList: Array<TelegramUser>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

interface AdminUserServerAttributes {
  adminUserId: number;
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminUserServerCreationAttributes extends Optional<AdminUserServerAttributes, 'adminUserId' | 'serverId'> {}

@Table({ tableName: 'admin_user_to_server' })
export class AdminUserServer extends Model<AdminUserServerAttributes, AdminUserServerCreationAttributes> {
  @ForeignKey(() => AdminUser)
  @Column
  adminUserId: number;

  @ForeignKey(() => Server)
  @Column
  serverId: string;
}
