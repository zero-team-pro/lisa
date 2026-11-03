import { rememberNexusMedia } from '@/services/nexusTelegramFiles';
import { randomBytes } from 'node:crypto';
import pMap from 'p-map';
import { Telegraf, Context as TelegramContext } from 'telegraf';
import { collectNexusAlbum, flushNexusAlbums } from '@/services/nexusAlbumIntake';
import { requireNexusTelegram } from '@/services/nexusChat';
import { extractNexusMedia } from '@/services/nexusTelegramMedia';
import { message } from 'telegraf/filters';

import { rememberNexusChatMessage } from '@/services/nexusChat';
import { startNexusTyping } from '@/services/nexusTyping';
import { telegramLogText } from '@/utils/telegramLogText';
import { Logger } from '@/controllers/logger';
import { OpenAI } from '@/controllers/openAI';
import { Context, sequelize } from '@/models';
import { BotModule, CommandList, ModuleList } from '@/modules';
import {
  CommandMap,
  CommandType,
  ContextData,
  CronAbility,
  ExecCommand,
  PhotoSize,
  RedisClientType,
  TelegrafBot,
  Transport,
  UserType,
} from '@/types';
import { initRedis, mergeObjects, sleep, splitObjects } from '@/utils';

import { CronJob } from 'cron';
import { BotError } from './botError';
import { Bridge } from './bridge';
import { Prometheus } from './prometheus';
import { BridgeControllerTelegram } from './telegram/bridgeController';
import { TelegramMessage } from './telegram/telegramMessage';

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
    this.bot = new Telegraf(token, { handlerTimeout: 300_000 });

    this.bridge = bridge;
    this.bridgeController = new BridgeControllerTelegram(this.bridge, this.bot);

    this.getReady();
  }

  public launch() {
    const { STAGING, TELEGRAM_WH_HOST, TELEGRAM_WH_PORT } = process.env;

    const isProd = STAGING === 'prod';

    const devConf: Telegraf.LaunchOptions = {};

    const secretToken = randomBytes(32).toString('hex');
    const prodConf: Telegraf.LaunchOptions = {
      webhook: { domain: `https://${TELEGRAM_WH_HOST}`, port: parseInt(TELEGRAM_WH_PORT), secretToken: secretToken },
    };

    return this.bot.launch(isProd ? prodConf : devConf);
  }

  private async getReady() {
    try {
      await sequelize.authenticate();
      Logger.info('PostgreSQL connection has been established successfully.');
    } catch (error) {
      Logger.crit('PostgreSQL init error:', error);
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

    this.bot.on('message', (ctx) => this.processContext(ctx));
    this.bot.on(message('photo'), (ctx) => this.processContext(ctx));
    this.bot.on(message('document'), (ctx) => this.processContext(ctx));
    this.bot.hears('message', (ctx) => this.processContext(ctx));
    this.bot.hears('photo', (ctx) => this.processContext(ctx));
    this.bot.hears('document', (ctx) => this.processContext(ctx));

    this.initCron();
    startNexusTyping(this.bot);
    let flushingAlbums = false;
    const albumTimer = setInterval(async () => {
      if (flushingAlbums || !this.bot.botInfo) return;
      flushingAlbums = true;
      try {
        await flushNexusAlbums(async (row) => {
          const parts = row.messages
            .filter((item) => !item.rejected)
            .map((item) => item.message)
            .sort((a, b) => a.message_id - b.message_id);
          if (!parts.length) return;
          const selected =
            parts.find((part) => /^\/nexus(?:@\w+)?(?:\s|$)/i.test((part as any).caption || '')) ||
            parts.find((part) => (part as any).caption) ||
            parts[0];
          const captions = parts
            .filter((part) => part !== selected)
            .map((part) => (part as any).caption)
            .filter(Boolean);
          const source = {
            ...selected,
            ...((selected as any).caption || captions.length
              ? { caption: [(selected as any).caption, ...captions].filter(Boolean).join('\n') }
              : {}),
          };
          const ctx = new TelegramContext(
            { update_id: 0, message: source } as any,
            this.bot.telegram,
            this.bot.botInfo,
          );
          return this.processContext(ctx, parts);
        });
      } catch {
        Logger.error('Nexus album finalization unavailable', {}, 'TelegramBot');
      } finally {
        flushingAlbums = false;
      }
    }, 500);
    albumTimer.unref();

    Logger.info('Ready!');

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  private processContext = async (ctx, albumParts: any[] | null = null) => {
    const t0 = performance.now();
    Prometheus.contextUpdatesInc();

    const message = new TelegramMessage(ctx, this.bridge, this.redis);
    await message.init();
    message.nexusAlbumParts = albumParts;
    if (!albumParts && message.message.media_group_id) {
      let authorized = false;
      try {
        await requireNexusTelegram(message);
        authorized = true;
      } catch {
        /* ordinary traffic retains existing handler */
      }
      if (
        authorized &&
        (!message.content.trimStart().startsWith('/') || /^\/nexus(?:@\w+)?(?:\s|$)/i.test(message.content))
      ) {
        const state = await collectNexusAlbum(message.chatId, message.message.media_group_id, message.message);
        if (state === 'late')
          await message.reply('Эта часть альбома пришла после его обработки. Отправь весь альбом ещё раз.');
        return;
      }
    }

    try {
      if (!albumParts) await this.awaitMediaGroup(message);
      else
        for (const part of albumParts) {
          const photo = [...(part.photo || [])].sort((a, b) => b.width * b.height - a.width * a.height)[0];
          if (photo) await message.pushImage(part.message_id, photo);
        }
      if (!message.isInterrupted) {
        const mediaGroup = this.messagesMediaGroup[message.message.media_group_id];
        mediaGroup?.map((image) => message.pushImage(image.id, image.image));
      }
    } catch (err) {
      Logger.error('Message media group error', err, 'TelegramBot');
    }

    Logger.info(
      'Message recieved',
      {
        from: message.fromId,
        chat: message.chatId,
        messageId: message.message.message_id,
        photos: (albumParts || [message.message]).reduce(
          (count, part) => count + (extractNexusMedia(part).some((item) => item.kind === 'photo') ? 1 : 0),
          0,
        ),
        isInterrupted: message.isInterrupted,
        content:
          message.mode === 'nexus' || message.parent?.isSelf ? '[private message]' : telegramLogText(message.content),
      },
      'TelegramBot',
    );

    if (message.isInterrupted) {
      return;
    }

    if (
      message.mode !== 'nexus' &&
      message.chatId === message.fromId &&
      !message.isGroup &&
      !message.message?.sender_chat &&
      !message.content.trimStart().startsWith('/')
    ) {
      await rememberNexusChatMessage(message.chatId, message.message.message_id, 'user', message.getAIContent());
      await rememberNexusMedia(message);
    }

    const messageStart = message.content?.split(' ')?.[0];
    const commandName = messageStart?.startsWith('/')
      ? `${messageStart?.substring(1)?.replace(/[,.]g/, '')?.toLocaleLowerCase()}`
      : null;

    await pMap(
      this.commandList,
      async (command) => {
        // TODO: isInterrupted and isProcessed do the same. Maybe should be force commands for processed messages.
        if (message.isInterrupted || message.isProcessed) {
          return;
        }

        if (typeof command.test === 'string' && command.test === commandName) {
          const execRes = await this.processCommand(command, message);
          if (execRes !== false) {
            message.markProcessed();
          }
        }
        if (Array.isArray(command.test) && command.test.includes(commandName)) {
          const execRes = await this.processCommand(command, message);
          if (execRes !== false) {
            message.markProcessed();
          }
        }
        if (typeof command.test === 'function' && (await command.test(message))) {
          await this.processCommand(command, message);
        }
      },
      { concurrency: 1 },
    );
    if (albumParts)
      return (
        message.nexusTaskAccepted || !(message.mode === 'nexus' || /^\/nexus(?:@\w+)?(?:\s|$)/i.test(message.content))
      );

    message.stopTyping();

    // TODO: Do the same inside message (constructor, reply, final)
    const t1 = performance.now();
    Logger.info(`Message processing took ${(t1 - t0).toFixed(0)} ms.`);
  };

  private async processCommand(command: CommandMap<ExecCommand>, message: TelegramMessage) {
    console.log('processCommand', { title: command.title }, 'Telegram Bot');
    try {
      return await command.exec(message);
    } catch (error) {
      this.processError(message, error);
    }
  }

  private processError(message: TelegramMessage, error) {
    if (error instanceof BotError) {
      if (error === BotError.INTERRUPTED) {
        return;
      } else {
        Logger.error(`BotError; Message: ${telegramLogText(message.content)}; Error: ${error}`);
        message
          .reply(error.message || 'Server error occurred')
          .catch((err) => Logger.error('Cannot send error: ', err));
      }
    } else {
      Logger.error(`Command error; Message: ${telegramLogText(message.content)}; Error: ${error}`);
      message.reply(`Server error occurred`).catch((err) => Logger.error('Cannot send error: ', err));
    }
  }

  // TODO: Good migrations, not 🩼?
  private async migrateModuleContext() {
    Logger.info('Starting context migrations');
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
    Logger.info(`Context migrations finished and took ${(t1 - t0).toFixed(0)} ms.`);
  }

  private async migrateContext(module: BotModule<any>, context: Context<ContextData>) {
    const groupTypes: UserType[] = ['discordServer', 'telegramChat'];
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
          Logger.info('Job', command.title, 'CRON');
          command.exec(this.bot);
        },
        start: true,
      });

      Logger.info('Job Init', command.title, 'CRON');
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
        setTimeout(
          () => {
            if (this.awaitingMessages[mediaGroupId]) {
              delete this.awaitingMessages[mediaGroupId];
              delete this.messagesMediaGroup[mediaGroupId];
            }
          },
          5 * 60 * 1000,
        );
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
