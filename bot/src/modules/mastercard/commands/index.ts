import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { rate } from './rate';
import { setRateCurr } from './setRateCurr';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: rate.methodName,
    description: 'Provides access to daily Mastercard cardholder currency conversion rates for payments.',
    test: rate.methodName,
    exec: rate.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: setRateCurr.methodName,
    description: 'Set your default bank account currency.',
    test: setRateCurr.methodName,
    exec: setRateCurr.exec,
    transports: [Transport.Discord, Transport.Telegram],
  },
];

export { commandMap };
