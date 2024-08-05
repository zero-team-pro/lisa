import { CommandMap, CommandType, ExecAbility, IBridgeResponse, IJsonRequest, Transport } from '@/types';
import { Bridge } from '@/controllers/bridge';
import { Errors } from '@/constants';
import { CommandList } from '@/modules';

import * as dotenv from 'dotenv';
dotenv.config();

export class BridgeControllerGateway {
  private bridge: Bridge;
  private commandList: CommandMap<ExecAbility<null>>[];

  constructor(bridge: Bridge) {
    this.bridge = bridge;
    this.commandList = CommandList.filter(
      (command) => command.type === CommandType.Ability && command.transports.includes(Transport.Gateway),
    );
  }

  public async init() {
    this.bridge.receiveMessages(this.onBridgeRequest);
  }

  private onBridgeRequest = (message: IJsonRequest) => {
    try {
      return this.processAbility(message);
    } catch (err) {
      console.warn(` [RMQ Gateway] error: `, err);
    }
  };

  private processAbility = async (message: IJsonRequest) => {
    const ability = this.commandList.find((ability) => ability.test === message.method);
    const method = ability?.exec;

    if (method) {
      let response: IBridgeResponse;
      try {
        const result = await method(message.params, null);
        response = { result };
      } catch (err) {
        // TODO: Error type check
        console.log(err);
        response = { result: null, error: Errors.UNKNOWN };
      }
      return this.bridge.response(message.from, message.id, response);
    } else {
      return console.warn(` [RMQ Gateway] Method ${message.method} not found;`);
    }
  };
}
