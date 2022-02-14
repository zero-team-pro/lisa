import amqp from 'amqplib';
import { Buffer } from 'buffer';

import { IBridgeRequest, IBridgeResponse, IJsonRequest, IJsonResponse } from '../types';

require('dotenv').config();

const { STAGING } = process.env;

interface IBridgeOptions {
  url: string;
  shardCount: number;
  discordToken?: string;
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
  private requestList: IRequestList = {};
  private requestGlobalList: IRequestGlobalList = {};
  private requestGlobalResolveList: IRequestGlobalResolveList = {};

  // TODO: Load from Redis and auto-refresh
  private isDebug: boolean = STAGING === 'dev';

  static GLOBAL_EXCHANGE = 'bots';

  private options = {
    url: 'amqp://localhost:5672',
    shardCount: 1,
    discordToken: null,
    timeout: 5000,
  };

  constructor(sender: string, options: IBridgeOptions) {
    this.sender = sender;

    Object.keys(options).forEach((key) => {
      this.options[key] = options[key];
    });
  }

  public init = async () => {
    const sendingInit = amqp
      .connect(this.options.url)
      .then((connection) => {
        this.sendingConnection = connection;

        connection
          .createChannel()
          .then((channel) => {
            this.sendingChannel = channel;
          })
          .catch((error) => {
            console.error('AMQP channel error: ', error);
            throw error;
          });

        connection
          .createChannel()
          .then(async (channel) => {
            await channel.assertExchange(Bridge.GLOBAL_EXCHANGE, 'fanout', { durable: false }).catch((error) => {
              console.error('AMQP exchange error: ', error);
              throw error;
            });
            this.globalSendingChannel = channel;
          })
          .catch((error) => {
            console.error('AMQP channel error: ', error);
            throw error;
          });

        return connection;
      })
      .catch((error) => {
        console.error('AMQP connection error: ', error);
        throw error;
      });

    const receivingInit = amqp
      .connect(this.options.url)
      .then((connection) => {
        this.receivingConnection = connection;

        connection
          .createChannel()
          .then((channel) => {
            this.receivingChannel = channel;
          })
          .catch((error) => {
            console.error('AMQP channel error: ', error);
            throw error;
          });

        return connection;
      })
      .catch((error) => {
        console.error('AMQP connection error: ', error);
        throw error;
      });

    return await Promise.all([sendingInit, receivingInit]);
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
      this.isDebug && console.log(` [RMQ x] Sent req to ${queueName}: ${Buffer.from(JSON.stringify(req))}`);
      return this.sendingChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(req)));
    });
  }

  public requestGlobal(message: IBridgeRequest) {
    this.requestCounter++;
    const req: IJsonRequest = {
      ...message,
      id: this.requestCounter,
      from: this.sender,
    };

    const waitingForResponse = {};
    this.requestGlobalResolveList[this.requestCounter] = {};
    const requestPromiseList: Promise<IJsonResponse>[] = [];
    this.channelNameList.forEach((channelName) => {
      const channelPromise = new Promise<IJsonResponse>((resolve: (value: IJsonResponse) => void, reject) => {
        this.requestGlobalResolveList[this.requestCounter][channelName] = resolve;

        setTimeout(() => {
          // TODO: Check is really error and log?
          reject(new Error('Timed out'));
        }, this.options.timeout);
      });
      waitingForResponse[channelName] = channelPromise;
      requestPromiseList.push(channelPromise);
    });
    this.requestGlobalList[this.requestCounter] = waitingForResponse;

    this.isDebug && console.log(` [RMQ x] Sent req global: ${Buffer.from(JSON.stringify(req))}`);
    // TODO: then => promise, catch => throw promise error immediately
    this.globalSendingChannel.publish(Bridge.GLOBAL_EXCHANGE, '', Buffer.from(JSON.stringify(req)));
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
      this.isDebug && console.log(` [RMQ x] Sent res to ${queueName}: ${Buffer.from(JSON.stringify(res))}`);
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
    this.isDebug && console.log(` [RMQ x] Received from ${data.from}: ${Buffer.from(JSON.stringify(data))}`);
  }

  public bindGlobalQueue() {
    return this.globalSendingChannel.bindQueue(this.sender, Bridge.GLOBAL_EXCHANGE, '');
  }
}
