import Sequelize from 'sequelize';
import {
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  HasOne,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

import { UserType } from '@/types';

import { Giveaway } from './giveaway';
import { GiveawayPrize } from './giveawayPrize';

interface GiveawayUserAttributes {
  id: number;
  userId: string;
  userType: UserType;
  giveaway: Giveaway;
  giveawayId: number;
  giveawayPrize: GiveawayPrize | null;
  createdAt: Date;
}

interface GiveawayUserCreationAttributes
  extends Sequelize.Optional<GiveawayUserAttributes, 'id' | 'giveaway' | 'giveawayPrize' | 'createdAt'> {}

@Table({ tableName: 'giveaway_user', updatedAt: false })
export class GiveawayUser extends Model<GiveawayUserAttributes, GiveawayUserCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  userId: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  userType: UserType;

  @BelongsTo(() => Giveaway)
  giveaway: ReturnType<() => Giveaway>;

  @Index
  @ForeignKey(() => Giveaway)
  @Column({
    allowNull: false,
  })
  giveawayId: number;

  @HasOne(() => GiveawayPrize, 'winnerId')
  giveawayPrize: ReturnType<() => GiveawayPrize | null>;

  @CreatedAt
  createdAt: Date;
}
