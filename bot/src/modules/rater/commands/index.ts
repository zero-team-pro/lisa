import { CommandMap, CommandType, ExecCommand, Transport } from '../../../types';
import { rate } from './rater';
import { preset } from './preset';
import { info } from './info';
import { raterEngine } from './raterEngine';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: rate.methodName,
    test: rate.methodName,
    exec: rate.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: preset.methodName,
    test: preset.methodName,
    exec: preset.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: info.methodName,
    test: info.methodName,
    exec: info.exec,
    transports: [Transport.Discord],
  },
  {
    type: CommandType.Command,
    title: raterEngine.methodName,
    test: raterEngine.methodName.toLocaleLowerCase(),
    exec: raterEngine.exec,
    transports: [Transport.Discord],
  },
];

export { commandMap };
