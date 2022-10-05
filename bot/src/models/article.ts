import { Optional } from 'sequelize';
import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

import { AdminUser } from './adminUser';
import { TelegramChat } from './telegramChat';
import { ArticleStatus, ArticleTransport, ArticleType } from '../types';

interface ArticleAttributes {
  id: number;
  transport: ArticleTransport;
  type: ArticleType;
  status: ArticleStatus;
  title: string;
  text: string;
  admin: AdminUser;
  adminId: number;
  chat: TelegramChat;
  chatId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ArticleCreationAttributes
  extends Optional<
    ArticleAttributes,
    'type' | 'title' | 'text' | 'admin' | 'chat' | 'chatId' | 'createdAt' | 'updatedAt'
  > {}

@Table({ tableName: 'article' })
export class Article extends Model<ArticleAttributes, ArticleCreationAttributes> {
  @PrimaryKey
  @Column(DataType.BIGINT)
  id: number;

  @AllowNull(false)
  @Column
  transport: ArticleTransport;

  @Column({ defaultValue: ArticleType.Post, allowNull: false })
  type: ArticleType;

  @Column({ defaultValue: ArticleStatus.Draft, allowNull: false })
  status: ArticleStatus;

  @Column
  title: string;

  @Column(DataType.TEXT)
  text: string;

  @BelongsTo(() => AdminUser)
  admin: AdminUser;

  @ForeignKey(() => AdminUser)
  @Index
  @AllowNull(false)
  @Column
  adminId: number;

  @BelongsTo(() => TelegramChat)
  chat: TelegramChat;

  @ForeignKey(() => TelegramChat)
  @Index
  @Column
  chatId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
