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
  Index,
  AutoIncrement, HasMany,
} from 'sequelize-typescript';
import { Optional } from 'sequelize';

import { Server } from './server';
import { Preset } from './preset';
import { Language } from '../constants';

interface UserAttributes {
  id: number;
  discordId: string;
  server: Server;
  serverId: string;
  isAdmin: boolean;
  isBlocked: boolean;
  lang: Language;
  raterLang: Language;
  raterLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    'id' | 'server' | 'isAdmin' | 'isBlocked' | 'lang' | 'raterLang' | 'raterLimit' | 'createdAt' | 'updatedAt'
  > {}

@Table({ tableName: 'user' })
export class User extends Model<UserAttributes, UserCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Index
  @Column
  discordId: string;

  @BelongsTo(() => Server)
  server: Server;

  @ForeignKey(() => Server)
  @Column
  serverId: string;

  @AllowNull(false)
  @Default(false)
  @Column
  isAdmin: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  isBlocked: boolean;

  @AllowNull(false)
  @Default('en')
  @Column
  lang: Language;

  @AllowNull(false)
  @Default('en')
  @Column
  raterLang: Language;

  @AllowNull(false)
  @Default(25)
  @Column
  raterLimit: number;

  @HasMany(() => Preset)
  presets: Preset[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
