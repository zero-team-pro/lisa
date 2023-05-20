import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';
import { ai } from './ai';
import { reply } from './reply';
import { aiBalance } from './aiBalance';
import { setGroupPay } from './setGroupPay';

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
  {
    type: CommandType.Command,
    title: aiBalance.methodName,
    description: 'Balance for OpenAI usage.',
    priority: Priority.COMMAND,
    test: aiBalance.methodName.toLocaleLowerCase(),
    exec: aiBalance.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: setGroupPay.methodName,
    description: 'Set group-based payment mode.',
    priority: Priority.COMMAND,
    test: setGroupPay.methodName.toLocaleLowerCase(),
    exec: setGroupPay.exec,
    transports: [Transport.Telegram],
  },
];

const isAICommand = (text: string): boolean => {
  const regex = /^(\/ai|Лиза|Lisa)([,.!?\s]+|$)/i;
  return regex.test(text.trim().toLowerCase());
};

export { commandMap };
