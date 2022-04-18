import {
  Table,
  Column,
  Model,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  Index,
  DataType,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

import { Language } from '../constants';
import { AdminUser } from './index';

interface UserAttributes {
  id: number;
  username: string;
  avatarUrlSmall: string;
  avatarUrlBig: string;
  lang: Language;
  admin: AdminUser;
  adminId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    'username' | 'avatarUrlSmall' | 'avatarUrlBig' | 'lang' | 'admin' | 'createdAt' | 'updatedAt'
  > {}

@Table({ tableName: 'telegram_user' })
export class TelegramUser extends Model<UserAttributes, UserCreationAttributes> {
  @PrimaryKey
  @Column(DataType.BIGINT)
  id: number;

  @Column
  username: string;

  @Column
  avatarUrlSmall: string;

  @Column
  avatarUrlBig: string;

  @Column
  lang: Language;

  @BelongsTo(() => AdminUser)
  admin: AdminUser;

  @ForeignKey(() => AdminUser)
  @Index
  @Column
  adminId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
