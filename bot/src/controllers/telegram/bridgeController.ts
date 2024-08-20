import {
  CommandMap,
  CommandType,
  ExecAbility,
  IBridgeResponse,
  IJsonRequest,
  RedisClientType,
  TelegrafBot,
  Transport,
} from '@/types';
import { Bridge } from '@/controllers/bridge';
import { Translation } from '@/translation';
import { Errors, Language } from '@/constants';
import { CommandList } from '@/modules';

import * as dotenv from 'dotenv';
import { Logger } from '@/controllers/logger';
dotenv.config();

export class BridgeControllerTelegram {
  private bridge: Bridge;
  private bot: TelegrafBot;
  private commandList: CommandMap<ExecAbility>[];
  private redis: RedisClientType;

  constructor(bridge: Bridge, bot: TelegrafBot) {
    this.bridge = bridge;
    this.bot = bot;
    this.commandList = CommandList.filter(
      (command) => command.type === CommandType.Ability && command.transports.includes(Transport.Telegram),
    );
  }

  public async init(redis: RedisClientType) {
    this.redis = redis;

    this.bridge.receiveMessages(this.onBridgeRequest);
    this.bridge.request('gateway', { method: 'alive' });
    // await this.bridge.bindGlobalQueue();
  }

  private onBridgeRequest = (message: IJsonRequest) => {
    try {
      return this.processAbility(message);
    } catch (err) {
      return Logger.warn('Error', err, 'RMQ Telegram');
    }
  };

  private processAbility = async (message: IJsonRequest) => {
    const ability = this.commandList.find((ability) => ability.test === message.method);
    const method = ability?.exec;
    const t = Translation(Language.English);

    if (method) {
      let response: IBridgeResponse;
      try {
        const result = await method(message.params, this.bot, this.redis);
        response = { result };
      } catch (err) {
        // TODO: Error type check
        console.log(err);
        response = { result: null, error: Errors.UNKNOWN };
      }
      return this.bridge.response(message.from, message.id, response);
    } else {
      return Logger.warn('Method not found', message.method, 'RMQ Telegram');
    }
  };
}
