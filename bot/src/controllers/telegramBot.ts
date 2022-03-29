import { Telegraf } from 'telegraf';

import { Bridge } from './bridge';

export class TelegramBot {
  private bridge: Bridge;
  private bot: Telegraf;

  constructor(bridge: Bridge, token: string) {
    this.bridge = bridge;

    this.bot = new Telegraf(token);

    this.getReady();
  }

  public launch() {
    return this.bot.launch();
  }

  private getReady() {
    this.bot.command('test', (ctx) => {
      ctx.reply('This is the test command');
    });

    this.bot.on('text', (message) => {
      message.reply(`Hello, ${message.state.role}!`);
    });

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}
