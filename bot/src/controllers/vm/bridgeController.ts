import { CronJob } from 'cron';
import Docker from 'dockerode';

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
import { Errors } from '@/constants';
import { CommandList, VMModule } from '@/modules';

import * as dotenv from 'dotenv';
import { VMConfigUtils } from '@/utils';
dotenv.config();

export class BridgeControllerVM {
  private bridge: Bridge;
  private config: VMConfig;
  private docker: Docker;
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

    const { token, name, externalIp } = await VMModule.api.init(this.bridge, { config: this.config });
    this.config = VMConfigUtils.updateValue({ token, name, externalIp });

    this.docker = new Docker();

    this.initCron();
  }

  private initCron() {
    this.cronList.forEach((command) => {
      if (typeof command.test !== 'string') {
        return;
      }

      CronJob.from({
        cronTime: command.test,
        onTick: () => {
          console.log(`  [ CRON Job ]: ${command.title}`);
          command.exec({ config: this.config, docker: this.docker });
        },
        start: true,
      });

      console.log(`  [ Cron job init ]: ${command.title}`);
    });
  }

  private onBridgeRequest = (message: IJsonRequest) => {
    try {
      return this.processAbility(message);
    } catch (err) {
      console.warn(` [RMQ VM] error: `, err);
    }
  };

  private processAbility = async (message: IJsonRequest) => {
    const ability = this.commandList.find((ability) => ability.test === message.method);
    const method = ability?.exec;

    if (method) {
      let response: IBridgeResponse;
      try {
        const result = await method(message.params, { config: this.config, docker: this.docker });
        response = { result };
      } catch (err) {
        // TODO: Error type check
        console.log(err);
        response = { result: null, error: Errors.UNKNOWN };
      }
      return this.bridge.response(message.from, message.id, response);
    } else {
      return console.warn(` [RMQ VM] Method ${message.method} not found;`);
    }
  };
}
