import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { listen } from './listen';
import { rating } from './rating';
import { stats } from './stats';

// TODO: Update for Discord
const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: listen.methodName,
    description: 'Rating listener for Telegram chats.',
    test: (message) => Boolean(message.content),
    exec: listen.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: rating.methodName,
    description: 'Chat rating top.',
    test: [rating.methodName, 'top'],
    exec: rating.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: stats.methodName,
    description: 'Your rating stats.',
    test: stats.methodName,
    exec: stats.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
