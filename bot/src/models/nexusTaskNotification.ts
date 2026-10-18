import { Optional } from 'sequelize';
import {
  AllowNull,
  BelongsTo,
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
  replyToMessageId: number | null;
  messageIds: number[] | null;
  claimedUntil: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
@Table({ tableName: 'nexus_task_notification' })
export class NexusTaskNotification extends Model<
  Attributes,
  Optional<Attributes, 'replyToMessageId' | 'messageIds' | 'claimedUntil' | 'deliveredAt' | 'createdAt' | 'updatedAt'>
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
  @Column(DataType.INTEGER) replyToMessageId: number | null;
  @Column(DataType.ARRAY(DataType.INTEGER)) messageIds: number[] | null;
  @BelongsTo(() => NexusTask)
  task: Awaited<NexusTask>;
  @CreatedAt
  createdAt: Date;
  @UpdatedAt
  updatedAt: Date;
}
