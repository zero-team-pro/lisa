import { Telegraf } from 'telegraf';

import { Bridge } from './bridge';
import { BotModule, CoreModule, TelegramModule, CmsModule } from '../modules';
import { CommandMap, CommandType, ExecAbility, ExecCommand, RedisClientType, Transport } from '../types';
import Translation from '../translation';
import { Language } from '../constants';
import { TelegramMessage } from './telegramMessage';
import { BridgeControllerTelegram } from './telegram/bridgeController';
import { sequelize } from '../models';
import { initRedis } from '../utils';

export class TelegramBot {
  private bot: Telegraf<TelegramMessage>;
  private redis: RedisClientType;
  private bridge: Bridge;
  private bridgeController: BridgeControllerTelegram;
  private modules: BotModule<any>[];

  constructor(bridge: Bridge, token: string) {
    this.bot = new Telegraf(token, { contextType: TelegramMessage });

    this.modules = [CoreModule, TelegramModule, CmsModule];

    const commandMap: CommandMap<ExecAbility>[] = this.modules.reduce((acc, module) => {
      acc = acc.concat(module.commandMap);
      return acc;
    }, []);

    this.bridge = bridge;
    this.bridgeController = new BridgeControllerTelegram(this.bridge, this.bot, commandMap);

    this.getReady();
  }

  public launch() {
    return this.bot.launch();
  }

  private async getReady() {
    try {
      await sequelize.authenticate();
      console.log('PostgreSQL connection has been established successfully.');
    } catch (error) {
      console.error('PostgreSQL init error:', error);
    }

    this.redis = await initRedis();

    await this.bridge.init();
    await this.bridgeController.init(this.redis);

    console.log('Ready!');

    const t = Translation(Language.English);

    const commandMap: CommandMap<ExecCommand>[] = this.modules.reduce((acc, module) => {
      acc = acc.concat(
        module.commandMap.filter(
          (command) => command.type === CommandType.Command && command.transports.includes(Transport.Telegram),
        ),
      );
      return acc;
    }, []);

    commandMap.map((command) => {
      // TODO: Different types
      if (typeof command.test === 'string') {
        this.bot.command(command.test, (ctx) => command.exec(ctx, t, {}));
      }
    });

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}
