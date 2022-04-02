import { CommandMap, CommandType, ExecAbility, Transport } from '../../../types';
import { isChatAdmin } from './isChatAdmin';

const commands = { isChatAdmin };

const commandMap: CommandMap<ExecAbility>[] = [
  {
    type: CommandType.Ability,
    title: 'Is Chat Admin',
    test: 'tg-isChatAdmin',
    description: 'Check is admin of the chat (channel, group or supper group)',
    exec: commands.isChatAdmin,
    transports: [Transport.Telegram],
  },
];

export { commandMap };
