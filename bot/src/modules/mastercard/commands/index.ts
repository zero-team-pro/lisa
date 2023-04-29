import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { rate } from './rate';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: rate.methodName,
    description: 'Links Telegram user to Lisa admin user.',
    test: rate.methodName,
    exec: rate.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
