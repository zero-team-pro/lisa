import { Sequelize } from 'sequelize-typescript';

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
