import { Sequelize } from 'sequelize-typescript';

import { sequelizeConfig } from '../configs';

const config = process.env.STAGING === 'dev' ? sequelizeConfig.development : sequelizeConfig.production;

export const sequelize = new Sequelize(config);
