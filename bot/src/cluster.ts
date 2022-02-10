import { Client } from 'discord-cross-hosting';

require('dotenv').config();

const client = new Client({
  agent: 'bot-shard',
  host: '192.168.88.32',
  port: 14444,
  //handshake: true
  authToken: 'bridgeSecretToken',
  rollingRestarts: false,
});

client.on('debug', console.log);
client.connect();

const Cluster = require('discord-hybrid-sharding');
// const nc = new Cluster();
const manager = new Cluster.Manager('./dist/bot.js', { totalShards: 1, totalClusters: 'auto' });

manager.on('clusterCreate', (cluster) => console.log(`Launched Cluster ${cluster.id}`));
manager.on('debug', console.log);

client
  .requestShardData()
  .then((e) => {
    if (!e) return;
    if (!e.shardList) return;
    manager.totalShards = e.totalShards;
    manager.totalClusters = e.shardList.length;
    manager.shardList = e.shardList;
    manager.clusterList = e.clusterList;
    manager.spawn({ timeout: -1 });
  })
  .catch((e) => console.log(e));

client.listen(manager);

client.on('bridgeMessage', (message) => {
  if (!message._sCustom) return;
  console.log(message);
});

client.on('bridgeRequest', (message) => {
  if (!message._sCustom && !message._sRequest) return;
  console.log(message);
  if ((message as any).ack) return message.reply({ message: 'I am alive!' });
  message.reply({ data: 'Hello World' });
});
