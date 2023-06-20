import { Telegraf } from 'telegraf';
import pMap from 'p-map';

import { BotModule, CommandList, ModuleList } from '@/modules';
import {
  CommandMap,
  CommandType,
  ContextData,
  ExecCommand,
  OwnerType,
  RedisClientType,
  TFunc,
  TelegrafBot,
  Transport,
} from '@/types';
import { Translation } from '@/translation';
import { Language } from '@/constants';
import { Context, sequelize } from '@/models';
import { initRedis, mergeObjects, splitObjects } from '@/utils';
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

    this.bridge = bridge;
    this.bridgeController = new BridgeControllerTelegram(this.bridge, this.bot);

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

    this.commandMap = CommandList.filter(
      (command) => command.type === CommandType.Command && command.transports.includes(Transport.Telegram),
    );

    await this.migrateModuleContext();

    this.bot.on('message', this.processContext);
    this.bot.on('photo', this.processContext);
    this.bot.hears('message', this.processContext);
    this.bot.hears('photo', this.processContext);

    console.log('Ready!');

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  private processContext = async (ctx) => {
    const t0 = performance.now();

    const message = new TelegramMessage(ctx, this.redis);
    await message.init();

    console.log(`Message recieve. From: ${message.fromId}; Chat: ${message.chatId}; ${message.content}`);

    const messageStart = message.content?.split(' ')?.[0];
    const commandName = messageStart?.startsWith('/')
      ? `${messageStart?.substring(1)?.replace(/[,.]g/, '')?.toLocaleLowerCase()}`
      : null;

    await pMap(
      this.commandMap,
      async (command) => {
        if (message.isInterrupted) {
          return;
        }

        if (typeof command.test === 'string' && command.test === commandName) {
          message.markProcessed();
          await this.processCommand(command, message);
        }
        if (Array.isArray(command.test) && command.test.includes(commandName)) {
          message.markProcessed();
          await this.processCommand(command, message);
        }
        if (typeof command.test === 'function' && (await command.test(message))) {
          message.markProcessed();
          await this.processCommand(command, message);
        }
      },
      { concurrency: 1 },
    );

    message.stopTyping();

    // TODO: Do the same inside message (constructor, reply, final)
    const t1 = performance.now();
    console.log(`Message processing took ${(t1 - t0).toFixed(0)} ms.`);
  };

  private async processCommand(command: CommandMap<ExecCommand>, message: TelegramMessage) {
    try {
      await command.exec(message);
    } catch (error) {
      this.processError(message, error);
    }
  }

  private processError(message: TelegramMessage, error) {
    if (error instanceof BotError) {
      if (error === BotError.INTERRUPTED) {
        return;
      } else {
        console.log(`BotError; Message: ${message.content}; Error: ${error}`);
        message.reply(error.message || 'Server error occurred').catch((err) => console.log('Cannot send error: ', err));
      }
    } else {
      console.log(`Command error; Message: ${message.content}; Error: ${error}`);
      message.reply(`Server error occurred`).catch((err) => console.log('Cannot send error: ', err));
    }
  }

  // TODO: Good migrations, not 🩼?
  private async migrateModuleContext() {
    console.log('Starting context migrations');
    const t0 = performance.now();

    await pMap(
      ModuleList,
      async (module) => {
        // TODO: Dangerous find all
        const contextList = await Context.findAll({ where: { module: module.id } });

        await pMap(contextList, (context) => this.migrateContext(module, context), { concurrency: 10 });
      },
      { concurrency: 1 },
    );

    const t1 = performance.now();
    console.log(`Context migrations finished and took ${(t1 - t0).toFixed(0)} ms.`);
  }

  private async migrateContext(module: BotModule<any>, context: Context<ContextData>) {
    const groupTypes: OwnerType[] = ['discordServer', 'telegramChat'];
    const isGroup = groupTypes.includes(context.ownerType);

    const defaultContextData = isGroup ? module.contextGroupData : module.contextData;

    if (!defaultContextData) {
      return;
    }

    const [contextDataMerged, isModifiedMerge] = mergeObjects(context.data, defaultContextData);
    const [contextData, isModifiedSplit] = splitObjects(contextDataMerged, defaultContextData);

    const isModified = isModifiedMerge || isModifiedSplit;

    if (isModified) {
      contextData.version = defaultContextData.version;
      context.data = contextData;
      await context.save();
    }
  }
}
