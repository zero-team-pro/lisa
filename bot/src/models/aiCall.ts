import Sequelize from 'sequelize';
import { Table, Column, Model, CreatedAt, PrimaryKey, AutoIncrement, Index, DataType } from 'sequelize-typescript';

import { OwnerType } from '@/types';

interface AICallAttributes {
  id: number;
  messageId: string;
  owner: string;
  ownerType: OwnerType;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  createdAt: Date;
}

interface AICallCreationAttributes extends Sequelize.Optional<AICallAttributes, 'id' | 'createdAt'> {}

@Table({ tableName: 'ai_call' })
export class AICall extends Model<AICallAttributes, AICallCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  messageId: string;

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

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  promptTokens: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  completionTokens: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  totalTokens: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  cost: number;

  @CreatedAt
  createdAt: Date;
}
