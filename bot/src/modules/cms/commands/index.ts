import { CommandMap, CommandType, ExecAbility, Transport } from '@/types';
import { Priority } from '@/constants';
import { isChatAdmin } from './isChatAdmin';
import { userList } from './userList';
import { chatList } from './chatList';
import { sendMessage } from './sendMessage';

const apiMethods = {
  isChatAdmin: isChatAdmin.apiExec,
  userList: userList.apiExec,
  chatList: chatList.apiExec,
  sendMessage: sendMessage.apiExec,
};

const commandMap: CommandMap<ExecAbility>[] = [
  {
    type: CommandType.Ability,
    title: 'Is chat admin',
    description: 'Check is admin of the chat (channel, group or supper group).',
    priority: Priority.API,
    test: isChatAdmin.methodName,
    exec: isChatAdmin.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Ability,
    title: "List of admin's users",
    description: "Gets admin user's telegram user list.",
    priority: Priority.API,
    test: userList.methodName,
    exec: userList.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Ability,
    title: "List of admin's chats and channels",
    description: "Gets admin user's telegram chat and channel list.",
    priority: Priority.API,
    test: chatList.methodName,
    exec: chatList.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Ability,
    title: 'Send message',
    description: 'Sends message to channel or chat.',
    priority: Priority.API,
    test: sendMessage.methodName,
    exec: sendMessage.exec,
    transports: [Transport.Telegram],
  },
];

export { commandMap, apiMethods };
