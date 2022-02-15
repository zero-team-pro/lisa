import { CommandMap } from '../../../types';
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
  },
  {
    test: 'lisa',
    exec: commands.lisa,
  },
  {
    test: 'config',
    exec: commands.config,
  },
  {
    test: 'debug',
    exec: commands.debug,
  },
  {
    test: 'lang',
    exec: commands.lang,
  },
  {
    test: 'help',
    exec: commands.help,
  },
];

export { commandMap };
