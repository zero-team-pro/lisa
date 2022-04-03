import { Telegraf } from 'telegraf';

import { CommandMap, CommandType, ExecAbility, IBridgeResponse, IJsonRequest, Transport } from '../../types';
import { Bridge } from '../bridge';
import { TelegramMessage } from '../telegramMessage';
import Translation from '../../translation';
import { Errors, Language } from '../../constants';

require('dotenv').config();

export class BridgeControllerTelegram {
  private bridge: Bridge;
  private bot: Telegraf<TelegramMessage>;
  private commandMap: CommandMap<ExecAbility>[];

  constructor(bridge: Bridge, bot: Telegraf<TelegramMessage>, commandMap: CommandMap<any>[]) {
    this.bridge = bridge;
    this.bot = bot;
    this.commandMap = commandMap.filter(
      (command) => command.type === CommandType.Ability && command.transports.includes(Transport.Telegram),
    );
  }

  public async init() {
    this.bridge.request('gateway', { method: 'alive' });
    // await this.bridge.bindGlobalQueue();
    this.bridge.receiveMessages(this.onBridgeRequest);
  }

  private onBridgeRequest = (message: IJsonRequest) => {
    try {
      return this.processAbility(message);
    } catch (err) {
      console.warn(` [RMQ Telegram] error: `, err);
    }
  };

  private processAbility = async (message: IJsonRequest) => {
    const ability = this.commandMap.find((ability) => ability.test === message.method);
    const method = ability?.exec;
    const t = Translation(Language.English);

    if (method) {
      let response: IBridgeResponse;
      try {
        const result = await method(message, this.bot, t);
        response = { result };
      } catch (err) {
        // TODO: Error type check
        console.log(err);
        response = { result: null, error: Errors.UNKNOWN };
      }
      return this.bridge.response(message.from, message.id, response);
    } else {
      return console.warn(` [RMQ shard] Method ${message.method} not found;`);
    }
  };
}
