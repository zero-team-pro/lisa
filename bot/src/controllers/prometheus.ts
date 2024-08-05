import Prom from 'prom-client';

export enum PrometheusService {
  Gateway = 'gateway',
  Telegram = 'telegram',
  VM = 'vm',
}

export class PrometheusInst {
  private prom: Prom.Registry;

  private requestsCounter: Prom.Counter;
  private httpRequestDuration: Prom.Histogram;

  private contextUpdatesCounter: Prom.Counter;
  private messagesSentCounter: Prom.Counter;

  constructor() {
    this.getReady();
  }

  public setService(name: PrometheusService, serviceId: string | null = null) {
    this.prom.setDefaultLabels({
      app: 'lisa',
      staging: `${process.env.STAGING}`,
      service: `${name}`,
      serviceId,
    });

    if (name === PrometheusService.Gateway) {
      this.prom.registerMetric(this.requestsCounter);
      this.prom.registerMetric(this.httpRequestDuration);
    }

    if (name === PrometheusService.Telegram) {
      this.prom.registerMetric(this.contextUpdatesCounter);
      this.prom.registerMetric(this.messagesSentCounter);
    }
  }

  private getReady() {
    this.prom = new Prom.Registry();
    this.prom.setDefaultLabels({
      app: 'lisa',
      staging: `${process.env.STAGING}`,
      service: 'unknown',
    });

    Prom.collectDefaultMetrics({ register: this.prom });

    this.requestsCounter = new Prom.Counter({
      name: 'requests_count_total',
      help: 'Total count of requests',
    });

    this.httpRequestDuration = new Prom.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in ms',
      labelNames: ['method', 'route', 'code'],
      buckets: [0.1, 0.3, 0.5, 1, 3, 5, 10, 60],
    });

    this.contextUpdatesCounter = new Prom.Counter({
      name: 'context_updates_count_total',
      help: 'Total count of context updates',
    });

    this.messagesSentCounter = new Prom.Counter({
      name: 'messages_sent_count_total',
      help: 'Total count of messages sent',
    });
  }

  public metrics() {
    return this.prom.metrics();
  }

  public startHttpRequestDurationTimer() {
    return this.httpRequestDuration.startTimer();
  }

  public requestsInc() {
    return this.requestsCounter.inc();
  }

  public contextUpdatesInc() {
    return this.contextUpdatesCounter.inc();
  }

  public messagesSentInc() {
    return this.messagesSentCounter.inc();
  }
}

export const Prometheus = new PrometheusInst();
