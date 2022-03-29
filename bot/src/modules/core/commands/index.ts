import { CommandMap, Transport } from '../../../types';
import { ping } from './ping';
import { config } from './config';
import { lisa } from './lisa';
import { debug } from './debug';
import { lang } from './lang';
import { help } from './help';

const commands = { ping, config, lisa, debug, lang, help };

const commandMap: CommandMap[] = [
  {
    test: 'ping',
    exec: commands.ping,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    test: 'lisa',
    exec: commands.lisa,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    test: 'config',
    exec: commands.config,
    transports: [Transport.Discord],
  },
  {
    test: 'debug',
    exec: commands.debug,
    transports: [Transport.Discord],
  },
  {
    test: 'lang',
    exec: commands.lang,
    transports: [Transport.Discord],
  },
  {
    test: 'help',
    exec: commands.help,
    transports: [Transport.Discord],
  },
];

export { commandMap };
