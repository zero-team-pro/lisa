import Sequelize from 'sequelize';
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
  BelongsToMany,
} from 'sequelize-typescript';

import { Channel } from './channel';
import { User } from './user';
import { Preset } from './index';
import { Language } from '../constants';
import { BotModuleId, BotModuleIdList, RaterEngine } from '../types';
import { AdminUser, AdminUserServer } from './adminUser';

interface ServerAttributes {
  id: string;
  prefix: string;
  lang: Language;
  raterLang: Language;
  mainChannelId: string;
  raterEngine: RaterEngine;
  channels: Channel[];
  users: User[];
  createdAt: Date;
  updatedAt: Date;
}

interface ServerCreationAttributes
  extends Sequelize.Optional<
    ServerAttributes,
    'lang' | 'raterLang' | 'prefix' | 'mainChannelId' | 'raterEngine' | 'channels' | 'users' | 'createdAt' | 'updatedAt'
  > {}

const modulesEnum = Sequelize.ENUM(...BotModuleIdList);
const modulesType = Sequelize.ARRAY(modulesEnum);

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
  lang: Language;

  @AllowNull(false)
  @Default('en')
  @Column
  raterLang: Language;

  @ForeignKey(() => Channel)
  @Column
  mainChannelId: string;

  @AllowNull(false)
  @Default('OCR')
  @Column
  raterEngine: RaterEngine;

  @Column({
    type: modulesType,
    defaultValue: ['core'],
    allowNull: false,
  })
  modules: BotModuleId[];

  @HasMany(() => Channel)
  channels: Channel[];

  @HasMany(() => User)
  users: User[];

  @HasMany(() => Preset)
  presets: Preset[];

  @BelongsToMany(() => AdminUser, () => AdminUserServer)
  adminUserList: Array<AdminUser>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
