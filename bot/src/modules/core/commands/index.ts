import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';
import { ping } from './ping';
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
    priority: Priority.COMMAND,
    test: ping.methodName,
    exec: ping.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: config.methodName,
    description: 'Configure bot for Discord server.',
    priority: Priority.COMMAND,
    test: config.methodName,
    exec: config.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: debug.methodName,
    description: 'Debug information for Discord server.',
    priority: Priority.COMMAND,
    test: debug.methodName,
    exec: debug.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: lang.methodName,
    description: 'Change language.',
    priority: Priority.COMMAND,
    test: lang.methodName,
    exec: lang.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: help.methodName,
    description: 'Help command. Provides information about other commands.',
    priority: Priority.COMMAND,
    test: help.methodName,
    exec: help.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: ls.methodName,
    description: 'List of available commands for messager you use.',
    priority: Priority.COMMAND,
    test: ls.methodName,
    exec: ls.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
];

export { commandMap };
