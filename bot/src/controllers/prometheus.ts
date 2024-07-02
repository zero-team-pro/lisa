import Prom from 'prom-client';

export class PrometheusInst {
  private prom: Prom.Registry;
  private messageCounter: Prom.Counter;

  constructor() {
    this.getReady();
  }

  public setServiceName(name: string) {
    this.prom.setDefaultLabels({
      app: 'lisa',
      staging: `${process.env.STAGING}`,
      service: `${name}`,
    });
  }

  private getReady() {
    this.prom = new Prom.Registry();
    this.prom.setDefaultLabels({
      app: 'lisa',
      staging: `${process.env.STAGING}`,
      service: 'unknown',
    });

    Prom.collectDefaultMetrics({ register: this.prom });

    this.messageCounter = new Prom.Counter({
      name: 'message_count_total',
      help: 'Total count of messages',
    });
    this.prom.registerMetric(this.messageCounter);
  }

  public metrics() {
    return this.prom.metrics();
  }

  public messageInc() {
    return this.messageCounter.inc();
  }
}

export const Prometheus = new PrometheusInst();
