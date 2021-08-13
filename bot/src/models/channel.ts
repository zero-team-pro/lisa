import { Table, Column, Model, CreatedAt, UpdatedAt, PrimaryKey, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Optional } from 'sequelize';

import { Server } from './server';

interface ChannelAttributes {
  id: string;
  server: Server;
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChannelCreationAttributes extends Optional<ChannelAttributes, 'server' | 'createdAt' | 'updatedAt'> {}

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

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
