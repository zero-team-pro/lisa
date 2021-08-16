import { sequelize } from './orm';
import { Server } from './server';
import { Channel } from './channel';
import { User } from './user';
import { Preset } from './preset';
import { RaterCall } from './raterCall';

sequelize.addModels([Server, Channel, User, Preset, RaterCall]);

export { sequelize, Server, Channel, User, Preset, RaterCall };
