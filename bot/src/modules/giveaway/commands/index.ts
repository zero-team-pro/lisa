import { CommandMap, CommandType, CronAbility, ExecCommand, TelegrafBot, Transport } from '@/types';
import { Priority } from '@/constants';

import { giveawayRegister } from './giveawayRegister';
import { giveawayFinish } from './giveawayFinish';
import { giveawaySendCron } from './giveawaySendCron';

const commandMap: CommandMap<ExecCommand | CronAbility<TelegrafBot>>[] = [
  {
    type: CommandType.Command,
    title: giveawayRegister.methodName,
    description: 'Register for giveaway.',
    priority: Priority.COMMAND,
    test: giveawayRegister.methodName.toLocaleLowerCase(),
    exec: giveawayRegister.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: giveawayFinish.methodName,
    description: 'Finish the giveaway.',
    priority: Priority.COMMAND,
    test: giveawayFinish.methodName.toLocaleLowerCase(),
    exec: giveawayFinish.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Cron,
    title: giveawaySendCron.methodName,
    description: 'Send giveaway prizes to winners.',
    priority: Priority.CRON,
    // Every 1 minutes
    test: '0 */1 * * * *',
    exec: giveawaySendCron.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
