import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';
import { ai } from './ai';
import { img } from './img';
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
    test: ai.test,
    exec: ai.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: `${ai.methodName}-mode`,
    description: 'Lisa mode.',
    priority: Priority.MODE,
    // TODO: Move to constants
    test: (message) => message.mode === 'lisa',
    exec: ai.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: img.methodName,
    description: 'Direct DallE request.',
    priority: Priority.LISTENER_ACTIVE,
    test: img.methodName.toLocaleLowerCase(),
    exec: img.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Command,
    title: reply.methodName,
    description: 'Listening reply to ChatGPT.',
    priority: Priority.LISTENER_EARLY,
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

export { commandMap };
