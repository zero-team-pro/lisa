import { CommandMap, CommandType, ExecCommand, Transport } from '../../../types';
import { shop } from './shop';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: shop.methodName,
    description: 'Shop for Telegram.',
    test: shop.methodName,
    exec: shop.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
