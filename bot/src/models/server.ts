import { DataTypes, Model } from 'sequelize';

import { sequelize } from './orm';
import { ChannelInstance } from './channel';

export class ServerInstance extends Model {
  id!: string;
  defaultLang!: string;
  prefix!: string;
  mainChannel: ChannelInstance;
  mainChannelId: typeof ChannelInstance.prototype.id;
  channels?: ChannelInstance[];
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
}

export const Server = sequelize.define<ServerInstance>(
  'server',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    defaultLang: {
      type: DataTypes.STRING,
      defaultValue: 'en',
      allowNull: false,
    },
    prefix: {
      type: DataTypes.STRING,
      defaultValue: '+',
      allowNull: false,
    },
  },
  { freezeTableName: true },
);
