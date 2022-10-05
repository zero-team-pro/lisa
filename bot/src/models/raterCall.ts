import { Optional } from 'sequelize';
import {
  Table,
  Column,
  Model,
  CreatedAt,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AutoIncrement,
  AllowNull,
  Index,
} from 'sequelize-typescript';

import { User } from './user';
import { RaterEngine } from '../types';

interface RaterCallsAttributes {
  id: number;
  time: Date;
  user: User;
  userId: number;
  rater: RaterEngine;
}

interface RaterCallsCreationAttributes extends Optional<RaterCallsAttributes, 'id' | 'time' | 'user'> {}

@Table({ tableName: 'rater_call', updatedAt: false })
export class RaterCall extends Model<RaterCallsAttributes, RaterCallsCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Index
  @CreatedAt
  time: Date;

  @BelongsTo(() => User)
  user: User;

  @AllowNull(false)
  @Index
  @ForeignKey(() => User)
  @Column
  userId: number;

  @AllowNull(true)
  @Column
  rater: RaterEngine;
}
