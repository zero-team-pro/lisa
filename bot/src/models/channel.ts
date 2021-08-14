import {
  Table,
  Column,
  Model,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  Default,
  AllowNull,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

import { Server } from './server';

interface ChannelAttributes {
  id: string;
  server: Server;
  serverId: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ChannelCreationAttributes
  extends Optional<ChannelAttributes, 'server' | 'isEnabled' | 'createdAt' | 'updatedAt'> {}

@Table({ tableName: 'channel' })
export class Channel extends Model<ChannelAttributes, ChannelCreationAttributes> {
  @PrimaryKey
  @Column
  id: string;

  @BelongsTo(() => Server)
  server: Server;

  @ForeignKey(() => Server)
  @Column
  serverId: string;

  @AllowNull(false)
  @Default(false)
  @Column
  isEnabled: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
