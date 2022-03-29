import { Telegraf } from 'telegraf';

import { Bridge } from './bridge';
import { BotModule, Core } from '../modules';
import { CommandMap, Transport } from '../types';
import Translation from '../translation';
import { Language } from '../constants';
import { TelegramMessage } from './telegramMessage';

export class TelegramBot {
  private bridge: Bridge;
  private bot: Telegraf<TelegramMessage>;
  private modules: BotModule[];

  constructor(bridge: Bridge, token: string) {
    this.bridge = bridge;

    this.bot = new Telegraf(token, { contextType: TelegramMessage });

    this.modules = [new Core()];

    this.getReady();
  }

  public launch() {
    return this.bot.launch();
  }

  private getReady() {
    const t = Translation(Language.English);

    this.bot.command('test', (message) => {
      message.reply(`Test: ${message.message.text}`);
    });

    const commandMap: CommandMap[] = this.modules.reduce((acc, module) => {
      acc = acc.concat(module.commandMap.filter((command) => command.transports.includes(Transport.Telegram)));
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
