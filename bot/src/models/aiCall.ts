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
  toolsTokens: number | null;
  cost: number;
  // TODO: Update model in DB and make not null
  model: string | null;
  createdAt: Date;
}

// TODO: Update model in DB and make not null
interface AICallCreationAttributes extends Sequelize.Optional<AICallAttributes, 'id' | 'createdAt' | 'toolsTokens'> {}

@Table({ tableName: 'ai_call', updatedAt: false })
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
    defaultValue: 0,
  })
  toolsTokens: number | null;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  cost: number;

  // TODO: Update model in DB and make not null
  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  model: string | null;

  @CreatedAt
  createdAt: Date;
}
