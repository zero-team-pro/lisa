import React, { useCallback, useEffect, useState } from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Button, CircularProgress } from '@mui/material';

import styles from './styles.module.scss';

import Config from 'App/constants/config';
import { IServiceStatus, IStatusSnapshot, ServiceGroup, ServiceState } from 'App/types';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

type DisplayGroup = ServiceGroup | 'discord';

const groupLabels: Record<DisplayGroup, string> = {
  application: 'Lisa services',
  discord: 'Discord shards',
  dependency: 'Infrastructure',
  external: 'External providers',
};

const stateLabels: Record<ServiceState, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  unavailable: 'Unavailable',
  unknown: 'Unknown',
};

const groups: DisplayGroup[] = ['application', 'discord', 'dependency', 'external'];

const belongsToGroup = (service: IServiceStatus, group: DisplayGroup) => {
  const isDiscordShard = service.group === 'application' && /^bot-\d+$/.test(service.id);
  return group === 'discord' ? isDiscordShard : service.group === group && !isDiscordShard;
};

const formatDate = (value?: string) => {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value));
};

const ServiceCard: React.FC<{ service: IServiceStatus }> = ({ service }) => (
  <article className={cx('service-card')}>
    <div className={cx('service-card__header')}>
      <div>
        <h3>{service.name}</h3>
        <span className={cx('service-card__kind')}>{service.critical ? 'Critical' : 'Optional'}</span>
      </div>
      <span className={cx('state', `state_${service.state}`)}>
        <span className={cx('state__dot')} aria-hidden />
        {stateLabels[service.state]}
      </span>
    </div>
    {service.note && <p className={cx('service-card__note')}>{service.note}</p>}
    <dl className={cx('service-card__metadata')}>
      {service.latencyMs !== undefined && (
        <div>
          <dt>Response time</dt>
          <dd>{service.latencyMs} ms</dd>
        </div>
      )}
      {service.lastSeenAt && (
        <div>
          <dt>Last heartbeat</dt>
          <dd>{formatDate(service.lastSeenAt)}</dd>
        </div>
      )}
    </dl>
  </article>
);

const StatusPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState<IStatusSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${Config.API_URL}/status/v1`, { signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Status request failed: ${response.status}`);
      setSnapshot((await response.json()) as IStatusSnapshot);
      setError(false);
    } catch (requestError) {
      if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
        setError(true);
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadStatus(controller.signal);
    const refreshTimer = window.setInterval(() => loadStatus(), 30_000);
    return () => {
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, [loadStatus]);

  const overall = error ? 'unknown' : snapshot?.overall || 'unknown';

  return (
    <div className={cx('status-page')}>
      <section className={cx('status-page__intro')}>
        <div>
          <p className={cx('status-page__eyebrow')}>Live diagnostics</p>
          <h1>Service status</h1>
          <p>Current health of Lisa services, infrastructure, and connected providers.</p>
        </div>
        <Button
          variant="outlined"
          startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={() => loadStatus()}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </section>

      <section className={cx('overall', `overall_${overall}`)} aria-live="polite">
        <span className={cx('overall__icon')} aria-hidden />
        <div>
          <strong>{error ? 'Status data is unavailable' : stateLabels[overall]}</strong>
          <p>
            {error
              ? 'The status endpoint could not be reached. Lisa may be experiencing an outage.'
              : overall === 'operational'
                ? 'All monitored Lisa services are operating normally.'
                : 'One or more monitored services need attention.'}
          </p>
        </div>
      </section>

      {snapshot && (
        <>
          {groups.map((group) => {
            const services = snapshot.services.filter((service) => belongsToGroup(service, group));
            if (!services.length) return null;
            return (
              <section className={cx('service-group')} key={group}>
                <h2>{groupLabels[group]}</h2>
                <div className={cx('service-grid')}>
                  {services.map((service) => (
                    <ServiceCard service={service} key={service.id} />
                  ))}
                </div>
              </section>
            );
          })}
          <p className={cx('status-page__updated')}>Last updated {formatDate(snapshot.generatedAt)}</p>
        </>
      )}
    </div>
  );
};

export { StatusPage };
