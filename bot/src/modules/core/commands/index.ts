import { CommandMap, CommandType, ExecCommand, Transport } from '../../../types';
import { ping } from './ping';
import { config } from './config';
import { lisa } from './lisa';
import { debug } from './debug';
import { lang } from './lang';
import { help } from './help';

const commands = { ping, config, lisa, debug, lang, help };

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: 'ping',
    test: 'ping',
    exec: commands.ping,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: 'lisa',
    test: 'lisa',
    exec: commands.lisa,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: 'config',
    test: 'config',
    exec: commands.config,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: 'debug',
    test: 'debug',
    exec: commands.debug,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: 'lang',
    test: 'lang',
    exec: commands.lang,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: 'help',
    test: 'help',
    exec: commands.help,
    transports: [Transport.Discord],
  },
];

export { commandMap };
