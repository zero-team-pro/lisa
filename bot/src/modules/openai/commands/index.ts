import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';
import { ai } from './ai';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: ai.methodName,
    description: 'Direct ChatGPT request.',
    priority: Priority.COMMAND,
    test: ai.methodName.toLocaleLowerCase(),
    exec: ai.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
];

export { commandMap };
