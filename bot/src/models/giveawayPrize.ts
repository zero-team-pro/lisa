import Sequelize from 'sequelize';
import {
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

import { Giveaway } from './giveaway';
import { GiveawayUser } from './giveawayUser';

interface GiveawayPrizeAttributes {
  id: number;
  title: string;
  description: string | null;
  prize: string;
  prizeType: string;
  status: string;
  giveaway: Giveaway;
  giveawayId: number;
  winner: GiveawayUser | null;
  winnerId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface GiveawayPrizeCreationAttributes
  extends Sequelize.Optional<
    GiveawayPrizeAttributes,
    'id' | 'description' | 'giveaway' | 'winner' | 'winnerId' | 'createdAt' | 'updatedAt'
  > {}

@Table({ tableName: 'giveaway_prize', updatedAt: false })
export class GiveawayPrize extends Model<GiveawayPrizeAttributes, GiveawayPrizeCreationAttributes> {
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
  description: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  prize: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  prizeType: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  status: string;

  @BelongsTo(() => Giveaway)
  giveaway: ReturnType<() => Giveaway>;

  @Index
  @ForeignKey(() => Giveaway)
  @Column({
    allowNull: false,
  })
  giveawayId: number;

  @BelongsTo(() => GiveawayUser)
  winner: GiveawayUser | null;

  @Index
  @ForeignKey(() => GiveawayUser)
  @Column({
    allowNull: true,
  })
  winnerId: number | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
