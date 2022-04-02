import { CommandMap, CommandType, ExecCommand, Transport } from '../../../types';
import { processRaterCommand } from './rater';
import { preset } from './preset';
import { info } from './info';
import { raterEngine } from './raterEngine';

const commands = { processRaterCommand, preset, info, raterEngine };

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: 'rate',
    test: 'rate',
    exec: commands.processRaterCommand,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: 'preset',
    test: 'preset',
    exec: commands.preset,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: 'info',
    test: 'info',
    exec: commands.info,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: 'raterEngine',
    test: 'raterEngine'.toLocaleLowerCase(),
    exec: commands.raterEngine,
    transports: [Transport.Discord],
  },
];

export { commandMap };
