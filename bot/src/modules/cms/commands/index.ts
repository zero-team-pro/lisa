import { CommandMap, CommandType, ExecAbility, Transport } from '../../../types';
import { isChatAdmin } from './isChatAdmin';

const apiMethods = { isChatAdminApi: isChatAdmin.apiExec };

const commandMap: CommandMap<ExecAbility>[] = [
  {
    type: CommandType.Ability,
    title: 'Is Chat Admin',
    test: isChatAdmin.methodName,
    description: 'Check is admin of the chat (channel, group or supper group)',
    exec: isChatAdmin.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap, apiMethods };
