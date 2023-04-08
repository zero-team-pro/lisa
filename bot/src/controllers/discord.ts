import { ChannelType, Client as DiscordClient, GatewayIntentBits, Message } from 'discord.js';

import { initRedis } from '@/utils';
import { BotModule, CoreModule, DiscordModule, RaterModule } from '@/modules';
import { Channel, Server, User, sequelize } from '@/models';
import { CommandMap, CommandType, ExecAbility, ExecCommand, RedisClientType, Transport } from '@/types';
import { Translation } from '@/translation';
import { BridgeController } from './discord/bridgeController';
import { Bridge } from './bridge';

require('dotenv').config();

export class Discord {
  private readonly client: DiscordClient;
  private readonly shardId: number;
  private redis: RedisClientType;
  private bridgeController: BridgeController;
  private modules: BotModule<any>[];

  constructor(bridge: Bridge, shardId: number, shardCount: number) {
    this.shardId = shardId;
    this.client = Discord.createClient(shardId, shardCount);

    this.modules = [CoreModule, DiscordModule, RaterModule];

    const commandMap: CommandMap<ExecAbility>[] = this.modules.reduce((acc, module) => {
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
        // await sequelize.sync({ alter: false, force: false });
        console.log('PostgreSQL has been updated to current models successfully.');
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

  private getUser = async (message: Message, server: Server) => {
    const [user] = await User.findOrCreate({
      where: { discordId: message.author.id, serverId: message.guild.id },
      defaults: { discordId: message.author.id, serverId: server.id },
    });
    return user;
  };

  private onMessageCreate() {
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) {
        return;
      }

      const [server] = await Server.findOrCreate({
        where: { id: message.guild.id },
        defaults: { id: message.guild.id },
        include: 'channels',
      });

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

      const messageParts = message.content.split(' ');
      console.log('messageCreate', messageParts.length, message.content);
      let command = messageParts[0].replace(',', '').toLocaleLowerCase();
      const prefix = server.prefix;

      if (command === 'lisa' || command === 'лиза') {
        command = 'lisa';
      }
      if (command !== 'lisa' && command.charAt(0) !== prefix) {
        return;
      } else if (command.charAt(0) === prefix) {
        command = command.substring(1);
      }

      const commandMap: CommandMap<ExecCommand>[] = this.modules.reduce((acc, module) => {
        if (server.modules.includes(module.id)) {
          acc = acc.concat(
            module.commandMap.filter(
              (command) => command.type === CommandType.Command && command.transports.includes(Transport.Discord),
            ),
          );
        }
        return acc;
      }, []);

      let isProcessed = false;
      for (const com of commandMap) {
        let shouldProcess = false;

        if (typeof com.test === 'string') {
          if (command === com.test) {
            shouldProcess = true;
          }
        } else if (Array.isArray(com.test)) {
          if (com.test.includes(command)) {
            shouldProcess = true;
          }
        } else if (typeof com.test === 'function') {
          if (com.test(command)) {
            shouldProcess = true;
          }
        }

        if (shouldProcess) {
          const user = await this.getUser(message, server);
          const t = Translation(user.lang || server.lang);
          if (user.isBlocked) {
            return;
          }

          await com.exec(message, t, { server, user });
          isProcessed = true;
          break;
        }
      }

      if (!isProcessed) {
        const t = Translation(server.lang);
        await message.reply(t('commandNotFound'));
      }
    });
  }
}
