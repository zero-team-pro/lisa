import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';
import { rate } from './rate';
import { setRate } from './setRate';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: rate.methodName,
    description: 'Provides access to daily Mastercard cardholder currency conversion rates for payments.',
    priority: Priority.COMMAND,
    test: rate.methodName.toLocaleLowerCase(),
    exec: rate.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: setRate.methodName,
    description: 'Set your default bank account currency.',
    priority: Priority.COMMAND,
    test: setRate.methodName.toLocaleLowerCase(),
    exec: setRate.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
];

export { commandMap };
