import { sequelize } from './orm';
import { Server } from './server';
import { Channel } from './channel';
import { User } from './user';
import { Preset } from './preset';

sequelize.addModels([Server, Channel, User, Preset]);

export { sequelize, Server, Channel, User, Preset };
