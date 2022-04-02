import { Telegraf } from 'telegraf';

import { Bridge } from './bridge';
import { BotModule, Core, CMS } from '../modules';
import { CommandMap, CommandType, ExecAbility, ExecCommand, Transport } from '../types';
import Translation from '../translation';
import { Language } from '../constants';
import { TelegramMessage } from './telegramMessage';
import { BridgeControllerTelegram } from './telegram/bridgeController';

export class TelegramBot {
  private bridge: Bridge;
  private bot: Telegraf<TelegramMessage>;
  private bridgeController: BridgeControllerTelegram;
  private modules: BotModule<any>[];

  constructor(bridge: Bridge, token: string) {
    this.bot = new Telegraf(token, { contextType: TelegramMessage });

    this.modules = [new Core(), new CMS()];

    const commandMap: CommandMap<ExecAbility>[] = this.modules.reduce((acc, module) => {
      acc = acc.concat(module.commandMap);
      return acc;
    }, []);

    this.bridge = bridge;
    this.bridgeController = new BridgeControllerTelegram(bridge, this.bot, commandMap);
    this.bridgeController.init();

    this.getReady();
  }

  public launch() {
    return this.bot.launch();
  }

  private getReady() {
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
