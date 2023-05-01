import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { listen } from './listen';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: listen.methodName,
    description: 'Commin listener function, proceed to other listeners.',
    test: (message) => !message.isProcessed && Boolean(message.content),
    exec: listen.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
];

export { commandMap };
