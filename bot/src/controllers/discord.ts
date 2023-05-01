import { ChannelType, Client as DiscordClient, GatewayIntentBits } from 'discord.js';

import { initRedis } from '@/utils';
import { ModuleList } from '@/modules';
import { Channel, Server, sequelize } from '@/models';
import { CommandMap, CommandType, ExecAbility, ExecCommand, RedisClientType, Transport } from '@/types';
import { Translation } from '@/translation';
import { BridgeController } from './discord/bridgeController';
import { Bridge } from './bridge';
import { DiscordMessage } from '@/controllers/discordMessage';
import { BotError } from '@/controllers/botError';

require('dotenv').config();

export class Discord {
  private readonly client: DiscordClient;
  private readonly shardId: number;
  private redis: RedisClientType;
  private bridgeController: BridgeController;

  constructor(bridge: Bridge, shardId: number, shardCount: number) {
    this.shardId = shardId;
    this.client = Discord.createClient(shardId, shardCount);

    const commandMap: CommandMap<ExecAbility>[] = ModuleList.reduce((acc, module) => {
      acc = acc.concat(module.commandMap);
      return acc;
    }, []);

    this.bridgeController = new BridgeController(bridge, this.redis, this.client, shardId, commandMap);

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

  private onReady() {
    this.client.once('ready', async () => {
      let isDatabaseOk = true;
      try {
        await sequelize.authenticate();
        console.log('PostgreSQL connection has been established successfully.');
      } catch (error) {
        isDatabaseOk = false;
        console.error('PostgreSQL init error:', error);
      }
      try {
        // redis.on('error', (err) => {
        //   console.log('Redis Client Error:', err);
        // });
        console.log('Redis connecting...');
        this.redis = await initRedis();
        console.log('Redis connection has been established successfully.');
      } catch (error) {
        isDatabaseOk = false;
        console.error('Redis init error:', error);
      }

      this.bridgeController.init();

      console.log('Ready!');

      const channel = this.client.channels.cache.get(process.env.MAIN_CHANNEL_ID);
      if (channel && channel.type === ChannelType.GuildText) {
        const welcomeMessage = isDatabaseOk ? 'Лиза проснулась' : 'Лиза проснулась без базы данных';

        channel.send(welcomeMessage + ` (Shard Id: ${this.shardId})`);
      }
    });
  }

  // TODO: Proceed listeners, remove module restrictions per server
  private onMessageCreate() {
    this.client.on('messageCreate', async (discordMessage) => {
      if (discordMessage.author.bot) {
        return;
      }

      const [server] = await Server.findOrCreate({
        where: { id: discordMessage.guild.id },
        defaults: { id: discordMessage.guild.id },
        include: 'channels',
      });

      const message = new DiscordMessage(discordMessage, server);

      const messageCache = { author: message.author.username, content: message.content };
      await this.redis.set('lastMessage', `${messageCache.content} ${new Date()}`, { EX: 3600 });

      const currentChannel = await Channel.findByPk(message.channel.id);
      if (
        message.channel.id !== process.env.MAIN_CHANNEL_ID &&
        server.mainChannelId &&
        message.channel.id !== server.mainChannelId &&
        (!currentChannel || !currentChannel.isEnabled) &&
        !message.content.startsWith('lisa global')
      ) {
        return;
      }

      const messageParts = (message.content as string)?.split(' ');
      console.log('messageCreate', messageParts.length, message.content);
      let command = messageParts?.[0]?.replace(/[,.]g/, '')?.toLocaleLowerCase();
      const prefix = server.prefix;

      if (command === 'lisa' || command === 'лиза') {
        command = 'lisa';
      }
      if (command !== 'lisa' && command.charAt(0) !== prefix) {
        return;
      } else if (command.charAt(0) === prefix) {
        command = command.substring(1);
      }

      const commandMap: CommandMap<ExecCommand>[] = ModuleList.reduce((acc, module) => {
        if (server.modules.includes(module.id)) {
          acc = acc.concat(
            module.commandMap.filter(
              (command) => command.type === CommandType.Command && command.transports.includes(Transport.Discord),
            ),
          );
        }
        return acc;
      }, []);

      for (const com of commandMap) {
        let shouldProcess = false;

        if (typeof com.test === 'string' && command === com.test) {
          shouldProcess = true;
        } else if (Array.isArray(com.test) && com.test.includes(command)) {
          shouldProcess = true;
        } else if (typeof com.test === 'function' && com.test(message)) {
          shouldProcess = true;
        }

        if (shouldProcess) {
          const user = await message.getUser();
          const t = Translation(user.lang || server.lang);
          if (user.isBlocked) {
            return;
          }

          message.markProcessed();
          try {
            await com.exec(message, t, { server, user });
          } catch (error) {
            if (error instanceof BotError) {
              message.reply(error.message || 'Server error occurred');
            } else {
              console.log(`Command error; Message: ${message.content}; Error: ${error}`);
              message.reply(`Server error occurred`);
            }
          }
          break;
        }
      }

      if (!message.isProcessed) {
        const t = Translation(server.lang);
        await message.reply(t('commandNotFound'));
      }
    });
  }
}
