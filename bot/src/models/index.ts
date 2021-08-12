import { sequelize } from './orm';
import { Server } from './server';
import { Channel } from './channel';

Server.hasMany(Channel);
Channel.belongsTo(Server);

export { sequelize, Server, Channel };
