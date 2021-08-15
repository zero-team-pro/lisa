import {
  Table,
  Column,
  Model,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AutoIncrement,
  AllowNull,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

import { Server } from './server';
import { User } from './user';

interface PresetAttributes {
  id: number;
  name: string;
  weights: string;
  server: Server;
  serverId: string;
  user: User;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PresetCreationAttributes
  extends Optional<PresetAttributes, 'id' | 'server' | 'serverId' | 'user' | 'userId' | 'createdAt' | 'updatedAt'> {}

@Table({ tableName: 'preset' })
export class Preset extends Model<PresetAttributes, PresetCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  weights: string;

  @BelongsTo(() => Server)
  server: Server;

  @ForeignKey(() => Server)
  @Column
  serverId: string;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
