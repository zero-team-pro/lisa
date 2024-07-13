import { CommandMap, CommandType, ExecAbility, IBridgeResponse, IJsonRequest, Transport, VMConfig } from '@/types';
import { Bridge } from '@/controllers/bridge';
import { Errors } from '@/constants';
import { CommandList, VMModule } from '@/modules';

import * as dotenv from 'dotenv';
import { VMConfigUtils } from '@/utils';
dotenv.config();

export class BridgeControllerVM {
  private bridge: Bridge;
  private config: VMConfig;
  private commandList: CommandMap<ExecAbility<VMConfig>>[];

  constructor(bridge: Bridge, config: VMConfig) {
    this.bridge = bridge;
    this.config = config;
    this.commandList = CommandList.filter(
      (command) => command.type === CommandType.Ability && command.transports.includes(Transport.VM),
    );
  }

  public async init() {
    await this.bridge.receiveMessages(this.onBridgeRequest);

    await this.bridge.request('gateway', { method: 'alive' });

    const { token, name, externalIp } = await VMModule.api.init(this.bridge, { config: this.config });
    this.config = VMConfigUtils.updateValue({ token, name, externalIp });

    // TODO: Make request to fill externalIp
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
        const result = await method(message.params, this.config);
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
