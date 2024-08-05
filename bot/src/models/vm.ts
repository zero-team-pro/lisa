import Sequelize from 'sequelize';
import { Column, CreatedAt, DataType, Index, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';

interface VMAttributes {
  id: string;
  name: string;
  token: string;
  externalIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VMCreationAttributes extends Sequelize.Optional<VMAttributes, 'createdAt' | 'updatedAt'> {}

@Table({ tableName: 'vm' })
export class VM extends Model<VMAttributes, VMCreationAttributes> {
  @PrimaryKey
  @Column
  id: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  name: string | null;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  token: string | null;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  externalIp: string | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
