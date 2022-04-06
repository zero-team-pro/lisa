import { CommandMap, CommandType, ExecCommand, Transport } from '../../../types';
import { ping } from './ping';
import { lisa } from './lisa';
import { config } from './config';
import { debug } from './debug';
import { lang } from './lang';
import { help } from './help';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: ping.methodName,
    test: ping.methodName,
    exec: ping.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: lisa.methodName,
    test: lisa.methodName,
    exec: lisa.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: config.methodName,
    test: config.methodName,
    exec: config.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: debug.methodName,
    test: debug.methodName,
    exec: debug.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: lang.methodName,
    test: lang.methodName,
    exec: lang.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: help.methodName,
    test: help.methodName,
    exec: help.exec,
    transports: [Transport.Discord],
  },
];

export { commandMap };
