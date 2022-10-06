import { Optional } from 'sequelize';
import {
  AllowNull,
  AutoIncrement,
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
import { ArticleStatus, ArticleType, Transport } from '../types';

interface ArticleAttributes {
  id: number;
  transport: Transport;
  type: ArticleType;
  status: ArticleStatus;
  title: string;
  text: string;
  messageId: number;
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
    'type' | 'title' | 'text' | 'messageId' | 'admin' | 'chat' | 'chatId' | 'createdAt' | 'updatedAt'
  > {}

@Table({ tableName: 'article' })
export class Article extends Model<ArticleAttributes, ArticleCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @AllowNull(false)
  @Column
  transport: Transport;

  @Column({ defaultValue: ArticleType.Post, allowNull: false })
  type: ArticleType;

  @Column({ defaultValue: ArticleStatus.Draft, allowNull: false })
  status: ArticleStatus;

  @Column
  title: string;

  @Column(DataType.TEXT)
  text: string;

  @Column
  messageId: number;

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
  @Column({ type: DataType.BIGINT })
  chatId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
