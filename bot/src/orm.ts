import { DataTypes, Model, Sequelize } from 'sequelize';

export const sequelize = new Sequelize(
  process.env.POSTGRES_DB,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD,
  {
    host: process.env.POSTGRES_HOST,
    logging: process.env.STAGING === 'dev',
    dialect: 'postgres',
  },
);

class ServerInstance extends Model {
  id!: number;
  defaultLang!: string;
  prefix!: string;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
}

export const Server = sequelize.define<ServerInstance>(
  'server',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    defaultLang: {
      type: DataTypes.STRING,
      defaultValue: 'en',
      allowNull: false,
    },
    prefix: {
      type: DataTypes.STRING,
      defaultValue: '+',
      allowNull: false,
    },
  },
  { freezeTableName: true },
);
