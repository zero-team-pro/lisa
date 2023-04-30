import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { rate } from './rate';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: rate.methodName,
    description: 'Provides access to daily Mastercard cardholder currency conversion rates for payments.',
    test: rate.methodName,
    exec: rate.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
