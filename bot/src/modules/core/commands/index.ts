import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { ping } from './ping';
import { lisa } from './lisa';
import { config } from './config';
import { debug } from './debug';
import { lang } from './lang';
import { help } from './help';
import { ls } from './ls';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: ping.methodName,
    description: 'Ping Lisa.',
    test: ping.methodName,
    exec: ping.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: lisa.methodName,
    description: 'Call Lisa.',
    test: lisa.methodName,
    exec: lisa.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: config.methodName,
    description: 'Configure bot for Discord server.',
    test: config.methodName,
    exec: config.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: debug.methodName,
    description: 'Debug information for Discord server.',
    test: debug.methodName,
    exec: debug.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: lang.methodName,
    description: 'Change language.',
    test: lang.methodName,
    exec: lang.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: help.methodName,
    description: 'Help command. Provides information about other commands.',
    test: help.methodName,
    exec: help.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: ls.methodName,
    description: 'List of available commands for messager you use.',
    test: ls.methodName,
    exec: ls.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
];

export { commandMap };
