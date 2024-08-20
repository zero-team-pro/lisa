import { CronJob } from 'cron';
import Docker from 'dockerode';

import * as dotenv from 'dotenv';
dotenv.config();

import {
  CommandMap,
  CommandType,
  CronAbility,
  ExecAbility,
  IBridgeResponse,
  IJsonRequest,
  Transport,
  VMConfig,
  VMExecParams,
} from '@/types';
import { Bridge } from '@/controllers/bridge';
import { Logger } from '@/controllers/logger';
import { Errors } from '@/constants';
import { CommandList, VMModule } from '@/modules';
import { sleep, VMConfigUtils } from '@/utils';

export class BridgeControllerVM {
  private bridge: Bridge;
  private config: VMConfig;
  private docker: Docker;
  private isInit: boolean = false;
  private commandList: CommandMap<ExecAbility<VMExecParams>>[];
  private cronList: CommandMap<CronAbility<VMExecParams>>[];

  constructor(bridge: Bridge, config: VMConfig) {
    this.bridge = bridge;
    this.config = config;
    this.commandList = CommandList.filter(
      (command) => command.type === CommandType.Ability && command.transports.includes(Transport.VM),
    );
    this.cronList = CommandList.filter(
      (command) => command.type === CommandType.Cron && command.transports.includes(Transport.VM),
    );
  }

  public async init() {
    await this.bridge.receiveMessages(this.onBridgeRequest);

    await this.bridge.request('gateway', { method: 'alive' });

    this.docker = new Docker();

    while (!this.isInit) {
      try {
        const { token, name, externalIp } = await VMModule.api.init(this.bridge, { config: this.config });
        this.config = VMConfigUtils.updateValue({ token, name, externalIp });
        this.isInit = true;
      } catch (err) {
        Logger.error('Cannot init', err, 'RMQ');
        await sleep(10_000);
      }
    }

    this.initCron();
  }

  public async updateConfig(config: Partial<VMConfig>) {
    const isUpdate = Object.keys(config).some((key) => config[key] !== config[key]);
    if (isUpdate) {
      this.config = VMConfigUtils.updateValue(config);
    }
  }

  private onBridgeRequest = (message: IJsonRequest) => {
    try {
      return this.processAbility(message);
    } catch (err) {
      return Logger.warn('Error', err, 'RMQ VM');
    }
  };

  private processAbility = async (message: IJsonRequest) => {
    const ability = this.commandList.find((ability) => ability.test === message.method);
    const method = ability?.exec;

    if (method) {
      let response: IBridgeResponse;
      try {
        const result = await method(message.params, {
          config: this.config,
          docker: this.docker,
          updateConfig: this.updateConfig,
        });
        response = { result };
      } catch (err) {
        // TODO: Error type check
        console.log(err);
        response = { result: null, error: Errors.UNKNOWN };
      }
      return this.bridge.response(message.from, message.id, response);
    } else {
      return Logger.warn('Method not found', message.method, 'RMQ VM');
    }
  };

  private initCron() {
    this.cronList.forEach((command) => {
      if (typeof command.test !== 'string') {
        return;
      }

      CronJob.from({
        cronTime: command.test,
        onTick: () => {
          Logger.info('Job', command.title, 'CRON');
          try {
            command.exec({ config: this.config, docker: this.docker, updateConfig: this.updateConfig });
          } catch (err) {
            Logger.error('Job Error', err, 'CRON');
          }
        },
        start: true,
      });

      Logger.info('Job Init', command.title, 'CRON');
    });
  }
}
