import { Optional } from 'sequelize';
import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { NexusTask } from './nexusTask';
interface Attributes {
  id: string;
  taskId: string;
  ownerChatId: string;
  text: string;
  claimedUntil: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
@Table({ tableName: 'nexus_task_notification' })
export class NexusTaskNotification extends Model<
  Attributes,
  Optional<Attributes, 'claimedUntil' | 'deliveredAt' | 'createdAt' | 'updatedAt'>
> {
  @PrimaryKey
  @Column(DataType.UUID)
  id: string;
  @ForeignKey(() => NexusTask)
  @AllowNull(false)
  @Column(DataType.UUID)
  taskId: string;
  @AllowNull(false)
  @Column(DataType.BIGINT)
  ownerChatId: string;
  @AllowNull(false)
  @Column(DataType.TEXT)
  text: string;
  @Column(DataType.DATE)
  claimedUntil: Date | null;
  @Column(DataType.DATE)
  deliveredAt: Date | null;
  @CreatedAt
  createdAt: Date;
  @UpdatedAt
  updatedAt: Date;
}
