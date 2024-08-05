import Sequelize from 'sequelize';
import { AutoIncrement, Column, CreatedAt, DataType, Index, Model, PrimaryKey, Table } from 'sequelize-typescript';

import { UserType } from '@/types';

interface PaymentTransactionAttributes {
  id: number;
  owner: string;
  ownerType: UserType;
  amount: number;
  method: string;
  status: string;
  paymentData: string;
  message: string;
  createdAt: Date;
}

interface PaymentTransactionCreationAttributes
  extends Sequelize.Optional<PaymentTransactionAttributes, 'id' | 'paymentData' | 'message' | 'createdAt'> {}

@Table({ tableName: 'payment_transaction' })
export class PaymentTransaction extends Model<PaymentTransactionAttributes, PaymentTransactionCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  owner: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  ownerType: UserType;

  @Column({
    type: DataType.DOUBLE,
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  method: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  status: string;

  @Column({ type: DataType.STRING })
  paymentData: string;

  @Column({ type: DataType.STRING })
  message: string;

  @CreatedAt
  createdAt: Date;
}
