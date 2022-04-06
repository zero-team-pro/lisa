import { CommandMap, CommandType, ExecCommand, Transport } from '../../../types';
import { linkMe } from './linkMe';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: 'linkMe',
    test: linkMe.methodName,
    description: 'Links Telegram user to Lisa admin user.',
    exec: linkMe.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
