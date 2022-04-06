import { CommandMap, CommandType, ExecCommand, Transport } from '../../../types';
import { linkMe } from './linkMe';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: linkMe.methodName,
    description: 'Links Telegram user to Lisa admin user.',
    test: linkMe.methodName,
    exec: linkMe.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
