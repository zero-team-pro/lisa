import { CommandMap, CommandType, ExecCommand, Transport } from '@/types';
import { Priority } from '@/constants';

import { datetime } from './datetime';

const commandMap: CommandMap<ExecCommand>[] = [
  {
    type: CommandType.Command,
    title: datetime.methodName,
    description: 'Provite current server date and time in ISO format. Should be formatted before sending to user.',
    priority: Priority.API,
    test: datetime.methodName.toLocaleLowerCase(),
    exec: datetime.exec,
    tool: datetime.tool,
    transports: [Transport.OpenAI],
    parameters: datetime.parameters,
  },
];

export { commandMap };
