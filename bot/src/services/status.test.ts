import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/models', () => ({
  sequelize: { authenticate: jest.fn() },
}));

import { aggregateOverall, heartbeatState, ServiceStatus } from './status';

const service = (overrides: Partial<ServiceStatus> = {}): ServiceStatus => ({
  id: 'service',
  name: 'Service',
  group: 'application',
  state: 'operational',
  critical: true,
  checkedAt: '2026-07-13T00:00:00.000Z',
  ...overrides,
});

describe('status aggregation', () => {
  it('ignores unknown external checks until they are implemented', () => {
    expect(aggregateOverall([service(), service({ group: 'external', state: 'unknown', critical: false })])).toBe(
      'operational',
    );
  });

  it('reports an outage for an unavailable critical service', () => {
    expect(aggregateOverall([service({ state: 'unavailable' })])).toBe('unavailable');
  });

  it('reports degradation for an unavailable optional service', () => {
    expect(aggregateOverall([service({ state: 'unavailable', critical: false })])).toBe('degraded');
  });
});

describe('heartbeat state', () => {
  it('distinguishes missing, current, and stale heartbeats', () => {
    const now = 120_000;
    expect(heartbeatState(undefined, now)).toBe('unknown');
    expect(heartbeatState({ state: 'operational', receivedAt: now - 10_000 }, now)).toBe('operational');
    expect(heartbeatState({ state: 'operational', receivedAt: now - 61_000 }, now)).toBe('unavailable');
  });
});
