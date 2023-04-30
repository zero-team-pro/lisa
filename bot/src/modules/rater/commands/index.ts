import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { rater } from './rater';
import { preset } from './preset';
import { info } from './info';
import { raterEngine } from './raterEngine';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: rater.methodName,
    description: 'Rates an Genshin Impact artifact against an optimal 5* artifact.',
    test: rater.methodName,
    exec: rater.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: preset.methodName,
    description: 'Presets for rater.',
    test: preset.methodName,
    exec: preset.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: info.methodName,
    description: 'Rater statistic.',
    test: info.methodName,
    exec: info.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: raterEngine.methodName,
    description: 'Change rater engine.',
    test: raterEngine.methodName.toLocaleLowerCase(),
    exec: raterEngine.exec,
    transports: [Transport.Discord],
  },
];

export { commandMap };
