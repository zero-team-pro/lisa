import { Sequelize } from 'sequelize-typescript';

import { sequelizeConfig } from '../configs';

const config = process.env.STAGING === 'dev' ? sequelizeConfig.development : sequelizeConfig.production;

// TODO
export const sequelize = new Sequelize(config as any);
