import Sequelize from 'sequelize';
import {
  Table,
  Column,
  Model,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  AutoIncrement,
  Index,
  DataType,
} from 'sequelize-typescript';

import { BotModuleId, ContextData, OwnerType } from '@/types';

interface ContextAttributes<T extends ContextData> {
  id: number;
  owner: string;
  ownerType: OwnerType;
  chatId: string;
  module: BotModuleId;
  data: T;
  createdAt: Date;
  updatedAt: Date;
}

interface ContextCreationAttributes
  extends Sequelize.Optional<ContextAttributes<any>, 'id' | 'chatId' | 'data' | 'createdAt' | 'updatedAt'> {}

@Table({ tableName: 'context' })
export class Context<T extends ContextData> extends Model<ContextAttributes<any>, ContextCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  owner: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  ownerType: OwnerType;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  chatId: string | null;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  module: BotModuleId;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  data: T;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
