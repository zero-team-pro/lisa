import { Client as DiscordClient, GatewayIntentBits } from 'discord.js';

import { initRedis } from '@/utils';
import { CommandList } from '@/modules';
import { Channel, sequelize } from '@/models';
import { CommandMap, CommandType, ExecCommand, RedisClientType, Transport } from '@/types';
import { BridgeController } from './discord/bridgeController';
import { Bridge } from './bridge';
import { DiscordMessage } from '@/controllers/discord/discordMessage';
import { BotError } from '@/controllers/botError';

import * as dotenv from 'dotenv';
dotenv.config();

export class Discord {
  private readonly client: DiscordClient;
  private redis: RedisClientType;
  private bridgeController: BridgeController;
  private commandMap: CommandMap<ExecCommand>[];

  constructor(bridge: Bridge, shardId: number, shardCount: number) {
    this.client = Discord.createClient(shardId, shardCount);

    this.bridgeController = new BridgeController(bridge, this.redis, this.client, shardId);

    // TODO: async in init
    this.onReady();
    this.onMessageCreate();
  }

  public login(discordToken: string) {
    return this.client.login(discordToken);
  }

  private static createClient(shardId: number, shardCount: number) {
    return new DiscordClient({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
      shards: shardId,
      shardCount,
    });
  }

  private async onReady() {
    await this.client.once('ready', async () => {
      try {
        await sequelize.authenticate();
        console.log('PostgreSQL connection has been established successfully.');
      } catch (error) {
        console.error('PostgreSQL init error:', error);
      }
      try {
        console.log('Redis connecting...');
        this.redis = await initRedis();
        console.log('Redis connection has been established successfully.');
      } catch (error) {
        console.error('Redis init error:', error);
      }

      this.bridgeController.init();

      console.log('Ready!');
    });

    this.commandMap = CommandList.filter(
      (command) => command.type === CommandType.Command && command.transports.includes(Transport.Discord),
    );
  }

  // TODO: Proceed listeners, remove module restrictions per server
  private onMessageCreate() {
    this.client.on('messageCreate', async (discordMessage) => {
      if (discordMessage.author.bot) {
        return;
      }

      const message = new DiscordMessage(discordMessage, this.redis);
      await message.init();

      const messageCache = { author: message.author.username, content: message.content };
      await this.redis.set('lastMessage', `${messageCache.content} ${new Date()}`, { EX: 3600 });

      const currentChannel = await Channel.findByPk(message.channel.id);
      if (
        message.channel.id !== process.env.MAIN_CHANNEL_ID &&
        message.server.mainChannelId &&
        message.channel.id !== message.server.mainChannelId &&
        (!currentChannel || !currentChannel.isEnabled) &&
        !message.content.startsWith('lisa global')
      ) {
        return;
      }

      const messageParts = message.content?.split(' ');
      console.log('messageCreate', messageParts.length, message.content);
      let commandName = messageParts?.[0]?.replace(/[,.]g/, '')?.toLocaleLowerCase();
      const prefix = message.server.prefix;

      if (commandName !== 'lisa' && commandName.charAt(0) !== prefix) {
        return;
      } else if (commandName.charAt(0) === prefix) {
        commandName = commandName.substring(1);
      }

      for (const command of this.commandMap) {
        let shouldProcess = false;

        if (typeof command.test === 'string' && commandName === command.test) {
          shouldProcess = true;
        } else if (Array.isArray(command.test) && command.test.includes(commandName)) {
          shouldProcess = true;
        } else if (typeof command.test === 'function' && command.test(message)) {
          shouldProcess = true;
        }

        if (shouldProcess) {
          if (message.user.isBlocked) {
            return;
          }

          message.markProcessed();
          try {
            await command.exec(message);
          } catch (error) {
            if (error instanceof BotError) {
              message.reply(error.message || 'Server error occurred');
            } else {
              console.log(`Command error; Message: ${message.content}; Error: ${error}`);
              message.reply(`Server error occurred`).catch((err) => console.log('Cannot send error: ', err));
            }
          }
          break;
        }
      }

      if (!message.isProcessed) {
        await message.reply(message.t('commandNotFound'));
      }
    });
  }
}
