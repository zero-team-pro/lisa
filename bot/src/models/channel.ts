import { DataTypes, Model } from 'sequelize';

import { sequelize } from './orm';
import { ServerInstance } from './server';

export class ChannelInstance extends Model {
  id!: number;
  server: ServerInstance;
  // serverId: any;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
}

export const Channel = sequelize.define<ChannelInstance>(
  'channel',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
  },
  { freezeTableName: true },
);
