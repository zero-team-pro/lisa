import { CommandMap } from '../../../types';
import { ping } from './ping';
import { config } from './config';
import { processRaterCommand } from './rater';
import { lisa } from './lisa';
import { debug } from './debug';
import { lang } from './lang';
import { preset } from './preset';
import { help } from './help';
import { info } from './info';
import { raterEngine } from './raterEngine';

const commands = { ping, config, processRaterCommand, lisa, debug, lang, preset, help, info, raterEngine };

const commandMap: CommandMap[] = [
  {
    test: 'ping',
    exec: commands.ping,
  },
  {
    test: 'rate',
    exec: commands.processRaterCommand,
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
    test: 'preset',
    exec: commands.preset,
  },
  {
    test: 'help',
    exec: commands.help,
  },
  {
    test: 'info',
    exec: commands.info,
  },
  {
    test: 'raterEngine'.toLocaleLowerCase(),
    exec: commands.raterEngine,
  },
];

export { commandMap };
