import Sequelize from 'sequelize';
import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

import { NexusTask } from './nexusTask';

export interface NexusTaskExecution {
  model: string | null;
  reasoningEffort: string | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningOutputTokens: number | null;
  durationMs: number | null;
  reusedFromAttempt: number | null;
}

interface NexusTaskAttemptAttributes {
  id: number;
  taskId: string;
  attempt: number;
  workerId: string;
  leaseTokenHash: string;
  leaseExpiresAt: Date;
  resultFingerprint: string | null;
  outcome: string | null;
  provider: string | null;
  summary: string | null;
  error: string | null;
  retryable: boolean | null;
  retryAt: Date | null;
  resultReceivedAt: Date | null;
  execution: NexusTaskExecution | null;
  createdAt: Date;
  updatedAt: Date;
}

interface NexusTaskAttemptCreationAttributes
  extends Sequelize.Optional<
    NexusTaskAttemptAttributes,
    | 'id'
    | 'resultFingerprint'
    | 'outcome'
    | 'provider'
    | 'summary'
    | 'error'
    | 'retryable'
    | 'retryAt'
    | 'resultReceivedAt'
    | 'execution'
    | 'createdAt'
    | 'updatedAt'
  > {}

@Table({ tableName: 'nexus_task_attempt' })
export class NexusTaskAttempt extends Model<NexusTaskAttemptAttributes, NexusTaskAttemptCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: number;

  @ForeignKey(() => NexusTask)
  @Index({ name: 'nexus_task_attempt_task_attempt', unique: true })
  @AllowNull(false)
  @Column(DataType.UUID)
  taskId: string;

  @Index({ name: 'nexus_task_attempt_task_attempt', unique: true })
  @AllowNull(false)
  @Column(DataType.INTEGER)
  attempt: number;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  workerId: string;

  @AllowNull(false)
  @Column(DataType.STRING(64))
  leaseTokenHash: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  leaseExpiresAt: Date;

  @Column(DataType.STRING(64))
  resultFingerprint: string | null;

  @Column(DataType.STRING(16))
  outcome: string | null;

  @Column(DataType.STRING(100))
  provider: string | null;

  @Column(DataType.TEXT)
  summary: string | null;

  @Column(DataType.TEXT)
  error: string | null;

  @Column(DataType.BOOLEAN)
  retryable: boolean | null;

  @Column(DataType.DATE)
  retryAt: Date | null;

  @Column(DataType.DATE)
  resultReceivedAt: Date | null;

  @Column(DataType.JSONB)
  execution: NexusTaskExecution | null;

  @BelongsTo(() => NexusTask)
  task: Awaited<NexusTask>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
