import { performance } from 'perf_hooks';

import { sequelize } from '@/models';
import { RedisClientType } from '@/types';

type StatusBridge = {
  isConnected: () => boolean;
};

export type ServiceState = 'operational' | 'degraded' | 'unavailable' | 'unknown';
export type ServiceGroup = 'application' | 'dependency' | 'external';

export interface ServiceStatus {
  id: string;
  name: string;
  group: ServiceGroup;
  state: ServiceState;
  critical: boolean;
  checkedAt: string;
  lastSeenAt?: string;
  latencyMs?: number;
  note?: string;
}

export interface StatusSnapshot {
  overall: Exclude<ServiceState, 'unknown'>;
  generatedAt: string;
  services: ServiceStatus[];
}

interface Heartbeat {
  state: Extract<ServiceState, 'operational' | 'degraded'>;
  receivedAt: number;
}

const REFRESH_INTERVAL_MS = 15_000;
const HEARTBEAT_STALE_MS = 60_000;
const CHECK_TIMEOUT_MS = 2_000;

const externalProviders = [
  ['discord-api', 'Discord API'],
  ['telegram-api', 'Telegram API'],
  ['s3', 'S3 object storage'],
  ['openai-api', 'OpenAI API'],
  ['mastercard-api', 'Mastercard API'],
  ['ocr-space-api', 'OCR.Space API'],
] as const;

export const aggregateOverall = (services: ServiceStatus[]): StatusSnapshot['overall'] => {
  if (services.some((service) => service.critical && service.state === 'unavailable')) {
    return 'unavailable';
  }
  if (services.some((service) => service.group !== 'external' && service.state !== 'operational')) {
    return 'degraded';
  }
  return 'operational';
};

export const heartbeatState = (heartbeat?: Heartbeat, now = Date.now()): ServiceState => {
  if (!heartbeat) return 'unknown';
  return now - heartbeat.receivedAt > HEARTBEAT_STALE_MS ? 'unavailable' : heartbeat.state;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs = CHECK_TIMEOUT_MS): Promise<T> => {
  let timeout: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error('Status check timed out')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }
};

class StatusService {
  private redis?: RedisClientType;
  private bridge?: StatusBridge;
  private heartbeats = new Map<string, Heartbeat>();
  private snapshot?: StatusSnapshot;
  private refreshPromise?: Promise<StatusSnapshot>;
  private refreshedAt = 0;

  public configure(runtime: { redis: RedisClientType; bridge: StatusBridge }) {
    this.redis = runtime.redis;
    this.bridge = runtime.bridge;
  }

  public recordHeartbeat(serviceId: string, state: Heartbeat['state'] = 'operational') {
    if (!/^(bot-\d+|telegram)$/.test(serviceId)) {
      return;
    }
    this.heartbeats.set(serviceId, {
      state: state === 'degraded' ? 'degraded' : 'operational',
      receivedAt: Date.now(),
    });
    this.refreshedAt = 0;
  }

  public async getSnapshot(): Promise<StatusSnapshot> {
    if (this.snapshot && Date.now() - this.refreshedAt < REFRESH_INTERVAL_MS) {
      return this.snapshot;
    }
    if (!this.refreshPromise) {
      this.refreshPromise = this.refresh().finally(() => {
        this.refreshPromise = undefined;
      });
    }
    return this.refreshPromise;
  }

  private async refresh(): Promise<StatusSnapshot> {
    const checkedAt = new Date().toISOString();
    const [postgres, redis] = await Promise.all([this.checkPostgres(checkedAt), this.checkRedis(checkedAt)]);

    const services: ServiceStatus[] = [
      {
        id: 'gateway',
        name: 'Gateway',
        group: 'application',
        state: 'operational',
        critical: true,
        checkedAt,
      },
      ...this.workerStatuses(checkedAt),
      postgres,
      redis,
      {
        id: 'rabbitmq',
        name: 'RabbitMQ',
        group: 'dependency',
        state: this.bridge?.isConnected() ? 'operational' : 'unavailable',
        critical: true,
        checkedAt,
      },
      ...externalProviders.map(
        ([id, name]): ServiceStatus => ({
          id,
          name,
          group: 'external',
          state: 'unknown',
          critical: false,
          checkedAt,
          note: 'Automated check is not implemented yet.',
        }),
      ),
    ];

    this.snapshot = { overall: aggregateOverall(services), generatedAt: checkedAt, services };
    this.refreshedAt = Date.now();
    return this.snapshot;
  }

  private workerStatuses(checkedAt: string): ServiceStatus[] {
    const expected = new Map<string, { publicId: string; name: string; critical: boolean }>();
    const shardCount = Math.max(Number.parseInt(process.env.SHARD_COUNT || '1', 10) || 1, 1);
    for (let shardId = 0; shardId < shardCount; shardId++) {
      expected.set(`bot-${shardId}`, {
        publicId: `bot-${shardId}`,
        name: `Discord shard ${shardId}`,
        critical: true,
      });
    }
    if (process.env.TELEGRAM_TOKEN) {
      expected.set('telegram', { publicId: 'telegram', name: 'Telegram worker', critical: false });
    }
    return [...expected.entries()].map(([id, definition]) => {
      const heartbeat = this.heartbeats.get(id);
      const state = heartbeatState(heartbeat);
      return {
        id: definition.publicId,
        name: definition.name,
        group: 'application',
        state,
        critical: definition.critical,
        checkedAt,
        ...(heartbeat ? { lastSeenAt: new Date(heartbeat.receivedAt).toISOString() } : {}),
      };
    });
  }

  private async checkPostgres(checkedAt: string): Promise<ServiceStatus> {
    const startedAt = performance.now();
    try {
      await withTimeout(sequelize.authenticate());
      return {
        id: 'postgresql',
        name: 'PostgreSQL',
        group: 'dependency',
        state: 'operational',
        critical: true,
        checkedAt,
        latencyMs: Math.round(performance.now() - startedAt),
      };
    } catch {
      return {
        id: 'postgresql',
        name: 'PostgreSQL',
        group: 'dependency',
        state: 'unavailable',
        critical: true,
        checkedAt,
      };
    }
  }

  private async checkRedis(checkedAt: string): Promise<ServiceStatus> {
    const startedAt = performance.now();
    try {
      if (!this.redis?.isOpen) throw new Error('Redis is not connected');
      await withTimeout(this.redis.ping());
      return {
        id: 'redis',
        name: 'Redis',
        group: 'dependency',
        state: 'operational',
        critical: true,
        checkedAt,
        latencyMs: Math.round(performance.now() - startedAt),
      };
    } catch {
      return {
        id: 'redis',
        name: 'Redis',
        group: 'dependency',
        state: 'unavailable',
        critical: true,
        checkedAt,
      };
    }
  }
}

export const statusService = new StatusService();
