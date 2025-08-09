import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';

import { datetime } from './datetime';
import { setAIModel } from './setAIModel';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: datetime.methodName,
    description: 'Provite current server date and time in ISO format. Should be formatted before sending to user.',
    priority: Priority.COMMAND,
    test: datetime.methodName.toLocaleLowerCase(),
    exec: datetime.exec,
    tool: datetime.tool,
    transports: [Transport.OpenAI],
    parameters: datetime.parameters,
  },
  {
    type: CommandType.Command,
    title: setAIModel.methodName,
    description:
      'Changes the ChatGPT model and its parameters to the provided one. Returns "success" if the change succeeds.',
    priority: Priority.COMMAND,
    test: setAIModel.methodName.toLocaleLowerCase(),
    exec: setAIModel.exec,
    tool: setAIModel.tool,
    transports: [Transport.OpenAI],
    parameters: setAIModel.parameters,
  },
];

export { commandMap };
