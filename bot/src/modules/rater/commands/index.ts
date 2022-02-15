import { CommandMap } from '../../../types';
import { processRaterCommand } from './rater';
import { preset } from './preset';
import { info } from './info';
import { raterEngine } from './raterEngine';

const commands = { processRaterCommand, preset, info, raterEngine };

const commandMap: CommandMap[] = [
  {
    test: 'rate',
    exec: commands.processRaterCommand,
  },
  {
    test: 'preset',
    exec: commands.preset,
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
