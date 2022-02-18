import { sequelize } from './orm';
import { Server } from './server';
import { Channel } from './channel';
import { User } from './user';
import { Preset } from './preset';
import { RaterCall } from './raterCall';
import { AdminUser, AdminUserServer } from './adminUser';

sequelize.addModels([Server, Channel, User, Preset, RaterCall, AdminUser, AdminUserServer]);

export { sequelize, Server, Channel, User, Preset, RaterCall, AdminUser, AdminUserServer };
