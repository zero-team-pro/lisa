import Sequelize from 'sequelize';
import {
  Table,
  Column,
  Model,
  CreatedAt,
  PrimaryKey,
  AutoIncrement,
  Index,
  DataType,
  UpdatedAt,
  Default,
} from 'sequelize-typescript';

import { UserType } from '@/types';

interface AIOwnerAttributes {
  id: number;
  owner: string;
  ownerType: UserType;
  spent: number;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AIOwnerCreationAttributes extends Sequelize.Optional<AIOwnerAttributes, 'id' | 'spent' | 'updatedAt'> {}

@Table({ tableName: 'ai_owner' })
export class AIOwner extends Model<AIOwnerAttributes, AIOwnerCreationAttributes> {
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
  ownerType: UserType;

  @Default(0)
  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  spent: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  balance: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  model: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  modelTools: string | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isToolsEnabled: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: null,
  })
  maxTokens: number | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  async spend(cost: number): Promise<this> {
    this.spent = this.spent + cost;
    this.balance = this.balance - cost;
    return await this.save();
  }
}
