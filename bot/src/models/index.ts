import { sequelize } from './orm';
import { Server } from './server';
import { Channel } from './channel';

// Channel.hasOne(Server, { as: 'server' });
// Server.belongsTo(Channel, { as: 'mainChannel', foreignKey: 'mainChannelId' });

Server.hasMany(Channel, { as: 'channels' });
Server.belongsTo(Server, { as: 'server', foreignKey: 'mainChannelId', constraints: false });
Channel.belongsTo(Server, { foreignKey: 'serverId', constraints: true });

export { sequelize, Server, Channel };
