import {
  Table,
  Column,
  Model,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AllowNull,
  DataType,
  Index,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

import { Language } from '../constants';
import { AdminUser } from './index';

interface ChatAttributes {
  id: number;
  type: string;
  username: string;
  title: string;
  description: string;
  photoUrl: string;
  lang: Language;
  admin: AdminUser;
  adminId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatCreationAttributes
  extends Optional<
    ChatAttributes,
    'username' | 'title' | 'description' | 'photoUrl' | 'lang' | 'admin' | 'createdAt' | 'updatedAt'
  > {}

@Table({ tableName: 'telegram_chat' })
export class TelegramChat extends Model<ChatAttributes, ChatCreationAttributes> {
  @PrimaryKey
  @Column(DataType.BIGINT)
  id: number;

  @AllowNull(false)
  @Column
  type: string;

  @Column
  username: string;

  @Column
  title: string;

  @Column
  description: string;

  @Column
  photoUrl: string;

  @Column
  lang: Language;

  @BelongsTo(() => AdminUser)
  admin: AdminUser;

  @ForeignKey(() => AdminUser)
  @Index
  @AllowNull(false)
  @Column
  adminId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
