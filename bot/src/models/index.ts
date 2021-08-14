import { sequelize } from './orm';
import { Server } from './server';
import { Channel } from './channel';
import { User } from './user';

sequelize.addModels([Server, Channel, User]);

export { sequelize, Server, Channel, User };
