import amqp from 'amqplib';
import { Buffer } from 'buffer';

export interface IRabbitOptions {
  url: string;
  shardCount: number;
  discordToken?: string;
  timeout?: number;
}

export class Rabbit {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

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
    await amqp
      .connect(this.options.url)
      .then((connection) => {
        this.connection = connection;

        this.connection
          .createChannel()
          .then((channel) => {
            this.channel = channel;
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
  };

  public sendMessage(queueName: string, message: string | Buffer) {
    const queue = this.channel.assertQueue(queueName, { durable: false });

    return queue.then((_qok) => {
      console.log(" [RMQ x] Sent '%s'", message);
      return this.channel.sendToQueue(queueName, Buffer.from(message));
    });
  }

  public receiveMessage(queueName: string) {
    const queue = this.channel.assertQueue(queueName, { durable: false });

    return queue.then((_qok) => {
      return this.channel.consume(
        queueName,
        (message) => {
          console.log(" [RMQ x] Received '%s'", message.content.toString());
        },
        { noAck: true },
      );
    });
  }
}
