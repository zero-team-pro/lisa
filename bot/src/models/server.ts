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
import { User } from './user';

interface ServerAttributes {
  id: string;
  prefix: string;
  mainChannelId: string;
  defaultLang: string;
  raterLang: string;
  channels: Channel[];
  users: User[];
  createdAt: Date;
  updatedAt: Date;
}

interface ServerCreationAttributes
  extends Optional<
    ServerAttributes,
    'defaultLang' | 'raterLang' | 'prefix' | 'mainChannelId' | 'channels' | 'users' | 'createdAt' | 'updatedAt'
  > {}

@Table({ tableName: 'server' })
export class Server extends Model<ServerAttributes, ServerCreationAttributes> {
  @Column({ type: DataType.STRING, primaryKey: true })
  id: string;

  @AllowNull(false)
  @Default('+')
  @Column
  prefix: string;

  @HasOne(() => Channel)
  mainChannel: Channel;

  @AllowNull(false)
  @Default('en')
  @Column
  defaultLang: string;

  @AllowNull(false)
  @Default('en')
  @Column
  raterLang: string;

  @ForeignKey(() => Channel)
  @Column
  mainChannelId: string;

  @HasMany(() => Channel)
  channels: Channel[];

  @HasMany(() => User)
  users: User[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
