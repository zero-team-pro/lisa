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

import { DiscordUser } from './user';
import { RaterEngine } from '../types';

interface RaterCallsAttributes {
  id: number;
  time: Date;
  user: DiscordUser;
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

  @BelongsTo(() => DiscordUser)
  user: DiscordUser;

  @AllowNull(false)
  @Index
  @ForeignKey(() => DiscordUser)
  @Column
  userId: number;

  @AllowNull(true)
  @Column
  rater: RaterEngine;
}
