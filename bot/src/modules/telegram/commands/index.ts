import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { linkMe } from './linkMe';
import { linkChannel } from './linkChannel';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: linkMe.methodName,
    description: 'Links Telegram user to Lisa admin user.',
    test: linkMe.methodName.toLocaleLowerCase(),
    exec: linkMe.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: linkChannel.methodName,
    description: 'Links Telegram channel or chat to Lisa admin user.',
    test: linkChannel.methodName.toLocaleLowerCase(),
    exec: linkChannel.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
