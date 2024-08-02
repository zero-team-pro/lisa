import { createHash } from 'crypto';
import pMap from 'p-map';
import { Telegraf } from 'telegraf';

import { Context, sequelize } from '@/models';
import { BotModule, CommandList, ModuleList } from '@/modules';
import {
  CommandMap,
  CommandType,
  ContextData,
  CronAbility,
  ExecCommand,
  OwnerType,
  PhotoSize,
  RedisClientType,
  TelegrafBot,
  Transport,
} from '@/types';
import { initRedis, mergeObjects, sleep, splitObjects } from '@/utils';
import { BotError } from './botError';
import { Bridge } from './bridge';
import { Prometheus } from './prometheus';
import { BridgeControllerTelegram } from './telegram/bridgeController';
import { TelegramMessage } from './telegram/telegramMessage';
import { OpenAI } from '@/controllers/openAI';
import { CronJob } from 'cron';

interface Image {
  /** Telegram message ID */
  id: number;
  image: PhotoSize;
}

/** Media group ID */
type MediaGroupMap = Record<string, Image[]>;

export class TelegramBot {
  private bot: TelegrafBot;
  private redis: RedisClientType;
  private bridge: Bridge;
  private bridgeController: BridgeControllerTelegram;
  private commandList: CommandMap<ExecCommand>[];
  private cronList: CommandMap<CronAbility<TelegrafBot>>[];

  private awaitingMessages: Record<string, TelegramMessage> = {};
  private messagesMediaGroup: MediaGroupMap = {};

  constructor(bridge: Bridge, token: string) {
    this.bot = new Telegraf(token);

    this.bridge = bridge;
    this.bridgeController = new BridgeControllerTelegram(this.bridge, this.bot);

    this.getReady();
  }

  public launch() {
    const { STAGING, TELEGRAM_WH_HOST, TELEGRAM_WH_PORT } = process.env;

    const isProd = STAGING === 'prod';

    const devConf: Telegraf.LaunchOptions = {};

    const randomBytes = Math.random().toString();
    const secretToken = createHash('sha256').update(randomBytes).digest('hex');
    const prodConf: Telegraf.LaunchOptions = {
      webhook: { domain: `https://${TELEGRAM_WH_HOST}`, port: parseInt(TELEGRAM_WH_PORT), secretToken: secretToken },
    };

    return this.bot.launch(isProd ? prodConf : devConf);
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
    await OpenAI.initTools(CommandList);
    await OpenAI.init();

    this.commandList = CommandList.filter(
      (command) => command.type === CommandType.Command && command.transports.includes(Transport.Telegram),
    );
    this.cronList = CommandList.filter(
      (command) => command.type === CommandType.Cron && command.transports.includes(Transport.Telegram),
    );

    await this.migrateModuleContext();

    this.bot.on('message', this.processContext);
    this.bot.on('photo', this.processContext);
    this.bot.hears('message', this.processContext);
    this.bot.hears('photo', this.processContext);

    this.initCron();

    console.log('Ready!');

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  private processContext = async (ctx) => {
    const t0 = performance.now();
    Prometheus.contextUpdatesInc();

    const message = new TelegramMessage(ctx, this.bridge, this.redis);
    await message.init();

    try {
      await this.awaitMediaGroup(message);
      if (!message.isInterrupted) {
        const mediaGroup = this.messagesMediaGroup[message.message.media_group_id];
        mediaGroup?.map((image) => message.pushImage(image.id, image.image));
      }
    } catch (err) {
      console.error('Message media group error:', err);
    }

    console.log(
      `Message recieved. From: ${message.fromId}; Chat: ${message.chatId}; ID: ${message.message.message_id}; Photos: ${
        (await message.images).length
      }; isInterrupted: ${message.isInterrupted}; Content: ${message.content};`,
    );

    if (message.isInterrupted) {
      return;
    }

    const messageStart = message.content?.split(' ')?.[0];
    const commandName = messageStart?.startsWith('/')
      ? `${messageStart?.substring(1)?.replace(/[,.]g/, '')?.toLocaleLowerCase()}`
      : null;

    await pMap(
      this.commandList,
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

  private initCron() {
    this.cronList.forEach((command) => {
      if (typeof command.test !== 'string') {
        return;
      }

      CronJob.from({
        cronTime: command.test,
        onTick: () => {
          console.log(`  [ CRON Job ]: ${command.title}`);
          command.exec(this.bot);
        },
        start: true,
      });

      console.log(`  [ Cron job init ]: ${command.title}`);
    });
  }

  private async awaitMediaGroup(message: TelegramMessage) {
    const mediaGroupId = message.message?.media_group_id;

    if (mediaGroupId) {
      if (!this.awaitingMessages[mediaGroupId]) {
        this.awaitingMessages[mediaGroupId] = message;
        this.pushImage(mediaGroupId, message.message.message_id, message.image);

        // Messages with the media group start arriving only after all media has been sent.
        // We are waiting for it to be received by the bot from the Telegram server. This time should be sufficient.
        await sleep(1000);

        // Delete message and media after some period
        setTimeout(() => {
          if (this.awaitingMessages[mediaGroupId]) {
            delete this.awaitingMessages[mediaGroupId];
            delete this.messagesMediaGroup[mediaGroupId];
          }
        }, 5 * 60 * 1000);
      } else {
        this.pushImage(mediaGroupId, message.message.message_id, message.image);

        if (message.content && !this.awaitingMessages[mediaGroupId].content) {
          this.awaitingMessages[mediaGroupId].markInterrupted();
          this.awaitingMessages[mediaGroupId] = message;
          await sleep(1000);
        } else {
          message.markInterrupted();
        }
      }
    }
  }

  private pushImage(mediaGroupId: string, messageId: number, image: PhotoSize) {
    if (!mediaGroupId) {
      return;
    }

    if (!this.messagesMediaGroup[mediaGroupId]) {
      this.messagesMediaGroup[mediaGroupId] = [];
    }

    this.messagesMediaGroup[mediaGroupId].push({ id: messageId, image });
  }
}
