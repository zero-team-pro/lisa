import { Telegraf } from 'telegraf';

import { ModuleList } from '@/modules';
import {
  CommandMap,
  CommandType,
  ExecAbility,
  ExecCommand,
  RedisClientType,
  TFunc,
  TelegrafBot,
  Transport,
} from '@/types';
import { Translation } from '@/translation';
import { Language } from '@/constants';
import { sequelize } from '@/models';
import { initRedis } from '@/utils';
import { Bridge } from './bridge';
import { TelegramMessage } from './telegramMessage';
import { BridgeControllerTelegram } from './telegram/bridgeController';
import { BotError } from '@/controllers/botError';

export class TelegramBot {
  private bot: TelegrafBot;
  private redis: RedisClientType;
  private bridge: Bridge;
  private bridgeController: BridgeControllerTelegram;
  private commandMap: CommandMap<ExecCommand>[];

  constructor(bridge: Bridge, token: string) {
    this.bot = new Telegraf(token);

    const commandMap: CommandMap<ExecAbility>[] = ModuleList.reduce((acc, module) => {
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

    this.commandMap = ModuleList.reduce((acc, module) => {
      acc = acc.concat(
        module.commandMap.filter(
          (command) => command.type === CommandType.Command && command.transports.includes(Transport.Telegram),
        ),
      );
      return acc;
    }, []);

    this.bot.on('text', this.processContext);
    this.bot.hears('text', this.processContext);

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  private processContext = async (ctx) => {
    const message = new TelegramMessage(ctx);
    console.log(`Message recieve. From: ${message.fromId}; Chat: ${message.chatId}; ${message.content}`);
    const messageStart = (message.content as string)?.split(' ')?.[0];
    const commandName = messageStart?.startsWith('/')
      ? `${messageStart?.substring(1)?.replace(/[,.]g/, '')?.toLocaleLowerCase()}`
      : null;

    this.commandMap.map((command) => {
      const t = Translation(Language.English);

      if (typeof command.test === 'string' && command.test === commandName) {
        message.markProcessed();
        this.processCommand(command, message, t);
      }
      if (Array.isArray(command.test) && command.test.includes(commandName)) {
        message.markProcessed();
        this.processCommand(command, message, t);
      }
      if (typeof command.test === 'function' && command.test(message)) {
        message.markProcessed();
        this.processCommand(command, message, t);
      }
    });
  };

  private async processCommand(command: CommandMap<ExecCommand>, message: TelegramMessage, t: TFunc) {
    try {
      await command.exec(message, t, {});
    } catch (error) {
      if (error instanceof BotError) {
        message.reply(error.message || 'Server error occurred');
      } else {
        console.log(`Command error; Message: ${message.content}; Error: ${error}`);
        message.reply(`Server error occurred`).catch((err) => console.log('Cannot send error: ', err));
      }
    }
  }
}
