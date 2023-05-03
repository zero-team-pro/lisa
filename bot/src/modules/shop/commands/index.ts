import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';
import { shop } from './shop';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: shop.methodName,
    description: 'Shop for Telegram.',
    priority: Priority.COMMAND,
    test: shop.methodName,
    exec: shop.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
