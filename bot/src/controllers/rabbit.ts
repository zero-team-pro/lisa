import amqp from 'amqplib';
import { Buffer } from 'buffer';

import { IBridgeRequest, IBridgeResponse } from '../types';

export interface IRabbitOptions {
  url: string;
  shardCount: number;
  discordToken?: string;
  timeout?: number;
}

export interface IJsonRequest extends IBridgeRequest {
  id: number;
}

export interface IJsonResponse extends IBridgeResponse {
  id: number;
}

type RequestCallback = (message: IBridgeRequest) => void;
type ResponseCallback = (message: IBridgeResponse) => void;

export class Rabbit {
  private sendingConnection: amqp.Connection;
  private receivingConnection: amqp.Connection;

  private sendingChannel: amqp.Channel;
  private globalSendingChannel: amqp.Channel;
  private receivingChannel: amqp.Channel;

  private requestCounter: number = 0;

  static GLOBAL_EXCHANGE = 'bots';

  private options = {
    url: 'amqp://localhost:5672',
    shardCount: 1,
    discordToken: null,
    timeout: 5000,
  };

  constructor(options: IRabbitOptions) {
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
            console.log('AMQP channel error: ', error);
            throw error;
          });

        connection
          .createChannel()
          .then(async (channel) => {
            await channel.assertExchange(Rabbit.GLOBAL_EXCHANGE, 'fanout', { durable: false }).catch((error) => {
              console.log('AMQP exchange error: ', error);
              throw error;
            });
            this.globalSendingChannel = channel;
          })
          .catch((error) => {
            console.log('AMQP channel error: ', error);
            throw error;
          });

        return connection;
      })
      .catch((error) => {
        console.log('AMQP connection error: ', error);
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
            console.log('AMQP channel error: ', error);
            throw error;
          });

        return connection;
      })
      .catch((error) => {
        console.log('AMQP connection error: ', error);
        throw error;
      });

    return await Promise.all([sendingInit, receivingInit]);
  };

  public request(queueName: string, message: IBridgeRequest) {
    const queue = this.sendingChannel.assertQueue(queueName, { durable: false });

    return queue.then((_qok) => {
      this.requestCounter++;
      const request: IJsonRequest = {
        ...message,
        id: this.requestCounter,
      };
      console.log(" [RMQ x] Sent req: '%s'", message);
      return this.sendingChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(request)));
    });
  }

  public requestGlobal(message: IBridgeRequest) {
    this.requestCounter++;
    console.log(" [RMQ x] Sent req global: '%s'", message);
    return this.globalSendingChannel.publish(Rabbit.GLOBAL_EXCHANGE, '', Buffer.from(JSON.stringify(message)));
  }

  public response(queueName: string, message: IBridgeResponse) {
    const queue = this.sendingChannel.assertQueue(queueName, { durable: false });

    return queue.then((_qok) => {
      console.log(" [RMQ x] Sent res: '%s'", message);
      return this.sendingChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
    });
  }

  public receiveMessages(queueName: string, requestCallback?: RequestCallback, responseCallback?: ResponseCallback) {
    const queue = this.receivingChannel.assertQueue(queueName, { durable: false });

    return queue.then((_qok) => {
      return this.receivingChannel.consume(
        queueName,
        (message) => {
          Rabbit.defaultOnReceiveMessage(message);
          // Так не делается, но да ладно...
          const data: IBridgeRequest & IBridgeResponse = JSON.parse(message.content.toString());
          const isResponse = !!data.result;
          if (requestCallback && !isResponse) {
            requestCallback(data as IBridgeRequest);
          }
          if (responseCallback && isResponse) {
            responseCallback(data as IBridgeResponse);
          }
        },
        { noAck: true },
      );
    });
  }

  private static defaultOnReceiveMessage(message: amqp.ConsumeMessage) {
    console.log(" [RMQ x] Received: '%s'", message.content.toString());
  }

  public bindGlobalQueue(queueName: string) {
    return this.globalSendingChannel.bindQueue(queueName, Rabbit.GLOBAL_EXCHANGE, '');
  }
}
