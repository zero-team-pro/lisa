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

    // Check is admin
    this.bot.command('test', async (message) => {
      const messageParts = message.content?.split(' ') || [];
      const params = messageParts.length > 1 ? messageParts.slice(1) : [];

      // TODO: +Url parse
      const chatId = params[0];

      if (!chatId) {
        return message.reply('Usage: `/test @channel`');
      }

      let reply;

      try {
        const chat = await this.bot.telegram.getChat(chatId);
        const chatAdminList = await this.bot.telegram.getChatAdministrators(chatId);
        let isAdmin = false;

        if (chat && chatAdminList) {
          chatAdminList?.map((admin) => {
            if (admin?.user?.id === message?.from?.id) {
              isAdmin = true;
            }
          });
        }

        reply = `IsAdmin: ${isAdmin}`;
      } catch (err) {
        console.log(err);
        reply = `Something went wrong`;
      }

      message.reply(reply);
    });

    // Post new text message
    this.bot.command('test2', async (message) => {
      const messageParts = message.content?.split(' ') || [];
      const params = messageParts.length > 1 ? messageParts.slice(1) : [];

      // TODO: +Url parse
      const chatId = params[0];

      if (!chatId) {
        return message.reply('Usage: `/test2 @channel`');
      }

      let chMes = null;
      try {
        chMes = await this.bot.telegram.sendMessage(chatId, 'This is a test message');
      } catch (e) {
        console.log(e);
      }

      const reply = `Message: ${JSON.stringify(chMes)}`;

      message.reply(`Test: ${reply}`);
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
