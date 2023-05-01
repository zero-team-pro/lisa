import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { listen } from './listen';
import { rating } from './rating';

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
    test: rating.methodName,
    exec: rating.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
