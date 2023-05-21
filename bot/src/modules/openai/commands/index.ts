import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';
import { ai } from './ai';
import { reply } from './reply';
import { aiBalance } from './aiBalance';
import { setGroupPay } from './setGroupPay';
import { aiGift } from './aiGift';
import { sendMoney } from './sendMoney';

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
  {
    type: CommandType.Command,
    title: aiGift.methodName,
    description: 'Gift funds to OpenAI module balance. Available only for global admins.',
    priority: Priority.COMMAND,
    test: aiGift.methodName.toLocaleLowerCase(),
    exec: aiGift.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: sendMoney.methodName,
    description: 'Send funds from your OpenAI module balance to someone else.',
    priority: Priority.COMMAND,
    test: sendMoney.methodName.toLocaleLowerCase(),
    exec: sendMoney.exec,
    transports: [Transport.Telegram],
  },
];

const isAICommand = (text: string): boolean => {
  const regex = /^(\/ai|Лиза|Lisa)([,.!?\s]+|$)/i;
  return regex.test(text.trim().toLowerCase());
};

export { commandMap };
