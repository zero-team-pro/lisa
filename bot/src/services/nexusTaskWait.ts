import pg from 'pg';
import { performance } from 'node:perf_hooks';

// Notifications only wake claimers. PostgreSQL remains the durable queue and lock.
// One dedicated connection per bounded waiter; never LISTEN on a pooled ORM connection.
export async function waitForNexusTask<T>(options: {
  ownerChatId: string;
  waitSeconds: number;
  signal: AbortSignal;
  claim: () => Promise<T>;
  hasTask: (result: T) => boolean;
}): Promise<T | null> {
  const deadline = performance.now() + options.waitSeconds * 1000;
  if (options.signal.aborted) return null;
  if (!options.waitSeconds) return options.claim();
  const client = new pg.Client({
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT || 5432),
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });
  let revision = 0;
  let wake: (() => void) | undefined;
  const notify = () => {
    revision++;
    wake?.();
  };
  client.on('notification', (message) => {
    if (message.channel === 'nexus_task_ready' && message.payload === options.ownerChatId) notify();
  });
  client.on('error', notify);
  options.signal.addEventListener('abort', notify);
  try {
    await client.connect();
    await client.query('LISTEN nexus_task_ready');
    // Subscribe before querying: a commit during the query cannot be lost.
    while (!options.signal.aborted) {
      const before = revision;
      const result = await options.claim();
      if (options.hasTask(result)) return result;
      const remaining = deadline - performance.now();
      if (remaining <= 0) return result;
      if (before !== revision) continue;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(done, Math.min(5000, remaining));
        function done() {
          clearTimeout(timer);
          wake = undefined;
          resolve();
        }
        wake = done;
        if (options.signal.aborted || before !== revision) done();
      });
      // The bounded reconciliation also discovers due retries and expired leases,
      // and keeps current-role authorization checks active while waiting.
    }
    return null;
  } finally {
    options.signal.removeEventListener('abort', notify);
    await client.end().catch(() => {});
  }
}
