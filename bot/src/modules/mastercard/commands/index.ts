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
    tool: rate.tool,
    // transports: [Transport.Discord, Transport.Telegram, Transport.OpenAI],
    transports: [Transport.Discord, Transport.Telegram],
    parameters: rate.parameters,
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
