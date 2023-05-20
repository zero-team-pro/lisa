import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';
import { ai } from './ai';
import { reply } from './reply';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: ai.methodName,
    description: 'Direct ChatGPT request.',
    priority: Priority.LISTENER_ACTIVE,
    test: (message) => isAICommand(message.content),
    exec: ai.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: reply.methodName,
    description: 'Listening reply to ChatGPT.',
    priority: Priority.LISTENER_ACTIVE,
    test: (message) => message.parent?.isSelf,
    exec: reply.exec,
    transports: [Transport.Telegram],
  },
];

const isAICommand = (text: string): boolean => {
  const regex = /^(\/ai|Лиза|Lisa)([,.!?\s]+|$)/i;
  return regex.test(text.trim().toLowerCase());
};

export { commandMap };
