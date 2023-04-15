import Sequelize from 'sequelize';
import {
  Table,
  Column,
  Model,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
  PrimaryKey,
  AutoIncrement,
  Index,
} from 'sequelize-typescript';

import { AdminUser, AdminUserOutlineServer } from './adminUser';

interface OutlineServerAttributes {
  id: number;
  externalId: string;
  accessUrl: string;
  name: string;
  adminUserList: Array<AdminUser>;
  createdAt: Date;
  updatedAt: Date;
}

interface OutlineServerCreationAttributes
  extends Sequelize.Optional<OutlineServerAttributes, 'id' | 'adminUserList' | 'createdAt' | 'updatedAt'> {}

@Table({ tableName: 'outline_server' })
export class OutlineServer extends Model<OutlineServerAttributes, OutlineServerCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Index
  @Column
  externalId: string;

  @Column
  accessUrl: string;

  @Column
  name: string;

  @BelongsToMany(() => AdminUser, () => AdminUserOutlineServer)
  adminUserList: Array<AdminUser>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
