import { CommandMap, CommandType, ExecAbility, Transport } from '../../../types';
import { isChatAdmin } from './isChatAdmin';
import { userList } from './userList';
import { chatList } from './chatList';

const apiMethods = { isChatAdmin: isChatAdmin.apiExec, userList: userList.apiExec, chatList: chatList.apiExec };

const commandMap: CommandMap<ExecAbility>[] = [
  {
    type: CommandType.Ability,
    title: 'Is chat admin',
    description: 'Check is admin of the chat (channel, group or supper group)',
    test: isChatAdmin.methodName,
    exec: isChatAdmin.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Ability,
    title: "List of admin's users",
    description: "Gets admin user's telegram user list",
    test: userList.methodName,
    exec: userList.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Ability,
    title: "List of admin's chats and channels",
    description: "Gets admin user's telegram chat and channel list",
    test: chatList.methodName,
    exec: chatList.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap, apiMethods };
