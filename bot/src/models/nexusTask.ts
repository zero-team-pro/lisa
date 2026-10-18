import type { NexusTaskOperation, NexusCaptureResult } from '@/services/nexusTaskRouting';
import Sequelize from 'sequelize';
import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Default,
  HasMany,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

import type { NexusTaskActor } from './nexusTaskRequest';
import { NexusTaskAttempt } from './nexusTaskAttempt';

export const NEXUS_TASK_STATUSES = ['queued', 'leased', 'completed', 'failed'] as const;
export type NexusTaskStatus = (typeof NEXUS_TASK_STATUSES)[number];
export const NEXUS_TASK_SOURCES = ['api', 'telegram'] as const;
export type NexusTaskSource = (typeof NEXUS_TASK_SOURCES)[number];

export interface NexusTaskInteraction {
  sourceMessageId: number;
  conversationId: string;
  parentTaskId: string | null;
  context: Array<{ role: 'user' | 'assistant'; text: string }>;
}

interface NexusTaskAttributes {
  operation: NexusTaskOperation | null;
  capture: NexusCaptureResult | null;

  interaction: NexusTaskInteraction | null;
  id: string;
  ownerChatId: string;
  text: string;
  source: NexusTaskSource;
  status: NexusTaskStatus;
  clientRequestId: string | null;
  createdBy: NexusTaskActor | null;
  attemptCount: number;
  maxAttempts: number;
  availableAt: Date | null;
  workerId: string | null;
  leaseTokenHash: string | null;
  leaseExpiresAt: Date | null;
  provider: string | null;
  resultSummary: string | null;
  lastError: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface NexusTaskCreationAttributes
  extends Sequelize.Optional<
    NexusTaskAttributes,
    | 'interaction'
    | 'status'
    | 'clientRequestId'
    | 'createdBy'
    | 'attemptCount'
    | 'maxAttempts'
    | 'availableAt'
    | 'workerId'
    | 'leaseTokenHash'
    | 'leaseExpiresAt'
    | 'provider'
    | 'resultSummary'
    | 'lastError'
    | 'completedAt'
    | 'capture'
    | 'operation'
    | 'createdAt'
    | 'updatedAt'
  > {}

@Table({ tableName: 'nexus_task' })
export class NexusTask extends Model<NexusTaskAttributes, NexusTaskCreationAttributes> {
  @Column(DataType.JSONB)
  interaction: NexusTaskInteraction | null;

  @Column(DataType.JSONB)
  capture: NexusCaptureResult | null;

  @Column(DataType.JSONB)
  operation: NexusTaskOperation | null;

  @PrimaryKey
  @Column(DataType.UUID)
  id: string;

  @Index('nexus_task_owner_status_available')
  @Index({ name: 'nexus_task_owner_client_request', unique: true })
  @AllowNull(false)
  @Column(DataType.BIGINT)
  ownerChatId: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  text: string;

  @AllowNull(false)
  @Column(DataType.STRING(16))
  source: NexusTaskSource;

  @Index('nexus_task_owner_status_available')
  @Default('queued')
  @AllowNull(false)
  @Column(DataType.STRING(16))
  status: NexusTaskStatus;

  @Index({ name: 'nexus_task_owner_client_request', unique: true })
  @Column(DataType.STRING(200))
  clientRequestId: string | null;

  @Column(DataType.JSONB)
  createdBy: NexusTaskActor | null;

  @Default(0)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  attemptCount: number;

  @Default(3)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  maxAttempts: number;

  @Index('nexus_task_owner_status_available')
  @Column(DataType.DATE)
  availableAt: Date | null;

  @Column(DataType.STRING(200))
  workerId: string | null;

  @Column(DataType.STRING(64))
  leaseTokenHash: string | null;

  @Column(DataType.DATE)
  leaseExpiresAt: Date | null;

  @Column(DataType.STRING(100))
  provider: string | null;

  @Column(DataType.TEXT)
  resultSummary: string | null;

  @Column(DataType.TEXT)
  lastError: string | null;

  @Column(DataType.DATE)
  completedAt: Date | null;

  @HasMany(() => NexusTaskAttempt)
  attempts: Array<NexusTaskAttempt>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
