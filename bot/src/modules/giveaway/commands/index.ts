import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';

import { giveawayRegister } from './giveawayRegister';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: giveawayRegister.methodName,
    description: 'Register for giveaway.',
    priority: Priority.COMMAND,
    test: giveawayRegister.methodName.toLocaleLowerCase(),
    exec: giveawayRegister.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
