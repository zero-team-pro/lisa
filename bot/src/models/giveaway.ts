import Sequelize from 'sequelize';
import {
  AutoIncrement,
  Column,
  CreatedAt,
  DataType,
  HasMany,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

import { UserType } from '@/types';

import { GiveawayPrize } from './giveawayPrize';
import { GiveawayUser } from './giveawayUser';

interface GiveawayAttributes {
  id: number;
  title: string;
  description: string;
  status: string;
  completionType: string;
  completionDate: Date | null;
  ownerId: string;
  ownerType: UserType;
  giveawayUsers: GiveawayUser[];
  giveawayPrizes: GiveawayPrize[];
  createdAt: Date;
  updatedAt: Date;
}

interface GiveawayCreationAttributes
  extends Sequelize.Optional<
    GiveawayAttributes,
    'id' | 'description' | 'completionDate' | 'giveawayUsers' | 'giveawayPrizes' | 'createdAt' | 'updatedAt'
  > {}

@Table({ tableName: 'giveaway' })
export class Giveaway extends Model<GiveawayAttributes, GiveawayCreationAttributes> {
  // TODO: Replace with uuid or create token for registration
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  status: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  completionType: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  completionDate: Date | null;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  ownerId: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  ownerType: UserType;

  @HasMany(() => GiveawayUser, 'giveawayId')
  giveawayUsers: GiveawayUser[];

  @HasMany(() => GiveawayPrize, 'giveawayId')
  giveawayPrizes: GiveawayPrize[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
