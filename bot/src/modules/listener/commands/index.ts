import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';
import { listen } from './listen';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: listen.methodName,
    description: 'Common listener function, proceed to other listeners.',
    priority: Priority.LISTENER,
    // test: (message) => !message.isProcessed && Boolean(message.content),
    test: () => false,
    exec: listen.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
];

export { commandMap };
