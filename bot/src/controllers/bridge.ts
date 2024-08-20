import amqp from 'amqplib';
import { Buffer } from 'buffer';
import fs from 'fs';

import * as dotenv from 'dotenv';
dotenv.config();

import { Logger } from '@/controllers/logger';
import { IBridgeRequest, IBridgeResponse, IJsonRequest, IJsonResponse } from '@/types';

const { STAGING } = process.env;

interface IBridgeOptions {
  url: string;
  shardCount?: number;
  timeout?: number;
}

type RequestCallback = (message: IJsonRequest) => void;

interface IRequestList {
  [id: number]: Promise<any>;
}

interface IRequestGlobalList {
  [id: number]: {
    [channel: string]: Promise<any>;
  };
}

interface IRequestGlobalResolveList {
  [id: number]: {
    [channel: string]: (value: any) => void;
  };
}

export class Bridge {
  private readonly sender: string;

  private sendingConnection: amqp.Connection;
  private receivingConnection: amqp.Connection;

  private sendingChannel: amqp.Channel;
  private globalSendingChannel: amqp.Channel;
  private receivingChannel: amqp.Channel;

  private requestCounter: number = 0;

  // TODO: Load from gateway or rabbit itself
  private channelNameList: string[] = ['bot-0', 'bot-1'];
  // TODO: Clear after timout/resolve/reject
  private requestList: IRequestList = {};
  private requestGlobalList: IRequestGlobalList = {};
  private requestGlobalResolveList: IRequestGlobalResolveList = {};

  // TODO: Load from Redis and auto-refresh
  private isDebug: boolean = STAGING === 'dev';

  static GLOBAL_EXCHANGE = 'bots';

  private options: IBridgeOptions = {
    url: 'amqp://localhost:5672',
    shardCount: 1,
    timeout: 5000,
  };

  constructor(sender: string, options: IBridgeOptions) {
    this.sender = sender;

    Object.keys(options).forEach((key) => {
      this.options[key] = options[key];
    });
  }

  public init = async () => {
    try {
      let rabbitCa;
      let rabbitCert;
      let rabbitKey;
      try {
        rabbitCa = fs.readFileSync('/certs/rabbit-mq/ca.crt', { encoding: 'utf-8' });
        rabbitCert = fs.readFileSync('/certs/rabbit-mq/client.crt', { encoding: 'utf-8' });
        rabbitKey = fs.readFileSync('/certs/rabbit-mq/client.key', { encoding: 'utf-8' });
      } catch (err) {
        Logger.crit('Reading certs error', err, 'Bridge');
      }

      const socketOptions = {
        cert: rabbitCert,
        key: rabbitKey,
        ca: [rabbitCa],
        rejectUnauthorized: false,
      };

      this.sendingConnection = await amqp.connect(this.options.url, socketOptions);
      this.receivingConnection = await amqp.connect(this.options.url, socketOptions);

      this.sendingChannel = await this.sendingConnection.createChannel();

      this.globalSendingChannel = await this.sendingConnection.createChannel();
      await this.globalSendingChannel.assertExchange(Bridge.GLOBAL_EXCHANGE, 'fanout', { durable: false });

      this.receivingChannel = await this.receivingConnection.createChannel();
    } catch (error) {
      Logger.error('AMQP connection or channel error', error, 'Bridge');
      throw error;
    }
  };

  public request(queueName: string, message: IBridgeRequest) {
    const queue = this.sendingChannel.assertQueue(queueName, { durable: false });

    return queue.then((_qok) => {
      this.requestCounter++;
      const req: IJsonRequest = {
        ...message,
        id: this.requestCounter,
        from: this.sender,
      };
      this.isDebug && Logger.info(`[RMQ x] Sent req to ${queueName}`, `${Buffer.from(JSON.stringify(req))}`, 'Bridge');
      return this.sendingChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(req)));
    });
  }

  public requestGlobal(message: IBridgeRequest, channelNameList?: string[]) {
    this.requestCounter++;
    const req: IJsonRequest = {
      ...message,
      id: this.requestCounter,
      from: this.sender,
    };

    const waitingForResponse = {};
    this.requestGlobalResolveList[this.requestCounter] = {};
    const requestPromiseList: Promise<IJsonResponse>[] = [];
    const channelList = channelNameList ?? this.channelNameList;
    channelList.forEach((channelName) => {
      const channelPromise = new Promise<IJsonResponse>((resolve: (value: IJsonResponse) => void, reject) => {
        this.requestGlobalResolveList[this.requestCounter][channelName] = resolve;

        setTimeout(() => {
          // Throwable
          // TODO: Check is really error and log?
          reject(new Error('Timed out'));
        }, this.options.timeout);
      });
      waitingForResponse[channelName] = channelPromise;
      if (channelNameList) {
        // TODO: then => promise, catch => throw promise error immediately
        this.sendingChannel.sendToQueue(channelName, Buffer.from(JSON.stringify(req)));
      }
      requestPromiseList.push(channelPromise);
    });
    this.requestGlobalList[this.requestCounter] = waitingForResponse;

    if (this.isDebug) {
      const message = `Sent req ${channelNameList ? channelNameList.join(' ') : 'global'}`;
      Logger.info(`[RMQ x] ${message}`, `${Buffer.from(JSON.stringify(req))}`, 'Bridge');
    }
    if (!channelNameList) {
      // TODO: then => promise, catch => throw promise error immediately
      this.globalSendingChannel.publish(Bridge.GLOBAL_EXCHANGE, '', Buffer.from(JSON.stringify(req)));
    }
    return Promise.all(requestPromiseList);
  }

  // TODO: queueName from request
  public response(queueName: string, reqId: number, message: IBridgeResponse) {
    const queue = this.sendingChannel.assertQueue(queueName, { durable: false });

    return queue.then((_qok) => {
      const res: IJsonResponse = {
        ...message,
        id: reqId,
        from: this.sender,
      };
      this.isDebug && Logger.info(`[RMQ x] Sent res to ${queueName}`, `${Buffer.from(JSON.stringify(res))}`, 'Bridge');
      return this.sendingChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(res)));
    });
  }

  public receiveMessages(requestCallback?: RequestCallback) {
    const queue = this.receivingChannel.assertQueue(this.sender, { durable: false });

    return queue.then((_qok) => {
      return this.receivingChannel.consume(
        this.sender,
        (message) => {
          const data: IJsonRequest & IJsonResponse = JSON.parse(message.content.toString());
          this.defaultOnReceiveMessage(data);
          // Так не делается, но да ладно...
          const isResponse = typeof data.result !== 'undefined' || typeof data.error !== 'undefined';
          if (requestCallback && !isResponse) {
            requestCallback(data as IJsonRequest);
          }
          if (isResponse) {
            // TODO: Global, check is in the list or use single
            const resolve = this.requestGlobalResolveList[data?.id]?.[data?.from];
            resolve && resolve(data);
          }
        },
        { noAck: true },
      );
    });
  }

  private defaultOnReceiveMessage(data: IJsonRequest & IJsonResponse) {
    this.isDebug && Logger.info(`[RMQ x] Received from ${data.from}`, `${Buffer.from(JSON.stringify(data))}`, 'Bridge');
  }

  public bindGlobalQueue() {
    return this.globalSendingChannel.bindQueue(this.sender, Bridge.GLOBAL_EXCHANGE, '');
  }
}
