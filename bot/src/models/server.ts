import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  HasOne,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  Default,
  ForeignKey,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

import { Channel } from './channel';

interface ServerAttributes {
  id: string;
  defaultLang: string;
  prefix: string;
  mainChannelId: string;
  channels: Channel[];
  createdAt: Date;
  updatedAt: Date;
}

interface ServerCreationAttributes
  extends Optional<
    ServerAttributes,
    'defaultLang' | 'prefix' | 'mainChannelId' | 'channels' | 'createdAt' | 'updatedAt'
  > {}

@Table({ tableName: 'server' })
export class Server extends Model<ServerAttributes, ServerCreationAttributes> {
  @Column({ type: DataType.STRING, primaryKey: true })
  id: string;

  @AllowNull(false)
  @Default('en')
  @Column
  defaultLang: string;

  @AllowNull(false)
  @Default('+')
  @Column
  prefix: string;

  @HasOne(() => Channel)
  mainChannel: Channel;

  @ForeignKey(() => Channel)
  @Column
  mainChannelId: string;

  @HasMany(() => Channel)
  channels: Channel[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
