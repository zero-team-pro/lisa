import { CommandMap, Transport } from '../../../types';
import { processRaterCommand } from './rater';
import { preset } from './preset';
import { info } from './info';
import { raterEngine } from './raterEngine';

const commands = { processRaterCommand, preset, info, raterEngine };

const commandMap: CommandMap[] = [
  {
    test: 'rate',
    exec: commands.processRaterCommand,
    transports: [Transport.Discord],
  },
  {
    test: 'preset',
    exec: commands.preset,
    transports: [Transport.Discord],
  },
  {
    test: 'info',
    exec: commands.info,
    transports: [Transport.Discord],
  },
  {
    test: 'raterEngine'.toLocaleLowerCase(),
    exec: commands.raterEngine,
    transports: [Transport.Discord],
  },
];

export { commandMap };
