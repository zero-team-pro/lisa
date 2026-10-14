import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = (name: string) => readFileSync(join(process.cwd(), 'src/migrations', name), 'utf8');

describe('Nexus task migration', () => {
  test('creates bounded task state, owner queue indexes, and attempt history', () => {
    const up = migration('5_nexus_tasks.up.sql');
    expect(up).toContain('CREATE TABLE IF NOT EXISTS public.nexus_task');
    expect(up).toMatch(/CHECK \(\s*"status" IN \('queued', 'leased', 'completed', 'failed'\)\s*\)/);
    expect(up).toContain('CHECK ("maxAttempts" = 3)');
    expect(up).toContain('nexus_task_owner_status_available');
    expect(up).toContain('nexus_task_owner_client_request');
    expect(up).toContain('CREATE TABLE IF NOT EXISTS public.nexus_task_attempt');
    expect(up).toContain('nexus_task_attempt_task_attempt');
    expect(up).toContain('CREATE TABLE public.nexus_task_notification');
    expect(up).toContain('nexus_task_notification_pending');
    expect(up).toContain('nexus_task_expired_lease');
  });

  test('rolls back attempt storage before task storage', () => {
    const down = migration('5_nexus_tasks.down.sql');
    expect(down.indexOf('DROP TABLE IF EXISTS public.nexus_task_notification')).toBeLessThan(
      down.indexOf('DROP TABLE IF EXISTS public.nexus_task_attempt'),
    );
    expect(down.indexOf('DROP TABLE IF EXISTS public.nexus_task_attempt')).toBeLessThan(
      down.indexOf('DROP TABLE IF EXISTS public.nexus_task;'),
    );
  });
});
