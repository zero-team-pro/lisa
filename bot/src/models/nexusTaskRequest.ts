import { Optional } from 'sequelize';
import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

export interface NexusTaskActor {
  type: 'telegram' | 'api';
  telegramUserId?: string | null;
  adminUserId?: number | null;
  apiTokenHash?: string | null;
}
interface Attributes {
  id: string;
  operation: string;
  ownerChatId: string | null;
  actor: NexusTaskActor;
  payload: Record<string, unknown>;
  taskId: string | null;
  responseStatus: number | null;
  createdAt: Date;
  updatedAt: Date;
}
@Table({ tableName: 'nexus_task_request' })
export class NexusTaskRequest extends Model<
  Attributes,
  Optional<Attributes, 'taskId' | 'responseStatus' | 'createdAt' | 'updatedAt'>
> {
  @PrimaryKey
  @Column(DataType.UUID)
  id: string;
  @AllowNull(false)
  @Column(DataType.STRING(16))
  operation: string;
  @Index('nexus_task_request_owner')
  @Column(DataType.BIGINT)
  ownerChatId: string | null;
  @AllowNull(false)
  @Column(DataType.JSONB)
  actor: NexusTaskActor;
  @AllowNull(false)
  @Column(DataType.JSONB)
  payload: Record<string, unknown>;
  @Index('nexus_task_request_task')
  @Column(DataType.UUID)
  taskId: string | null;
  @Column(DataType.INTEGER)
  responseStatus: number | null;
  @CreatedAt
  createdAt: Date;
  @UpdatedAt
  updatedAt: Date;
}
