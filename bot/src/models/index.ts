import { sequelize } from './orm';
import { Server } from './server';
import { Channel } from './channel';

sequelize.addModels([Server, Channel]);

export { sequelize, Server, Channel };
