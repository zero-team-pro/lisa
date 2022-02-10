import { Bridge } from 'discord-cross-hosting';

require('dotenv').config();

const { DISCORD_TOKEN } = process.env;

// const {Bridge} = require('discord-cross-hosting');

const server = new Bridge({
  port: 14444,
  authToken: 'bridgeSecretToken',
  totalShards: 2,
  totalMachines: 2,
  shardsPerCluster: 1,
  token: DISCORD_TOKEN,
});

server.on('debug', console.log);
server.start();

server.on('ready', (url) => {
  console.log('Server is ready' + url);

  setInterval(() => {
    server
      .broadcastEval('this.guilds.cache.size')
      .then((res) => {
        console.log('Bridge eval guild size: ', res);
      })
      .catch((err) => {
        console.log('Bridge interval error: ', err);
      });
  }, 10000);
});

server.on('clientMessage', (message) => {
  if (!message._sCustom) return;
  console.log(message);
});

server.on('clientRequest', (message) => {
  if (!message._sCustom && !message._sRequest) return;
  if ((message as any).ack) return message.reply({ message: 'I am alive!' });
  console.log(message);
  message.reply({ data: 'Hello World' });
});
