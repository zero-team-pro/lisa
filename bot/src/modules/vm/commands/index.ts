import { CommandMap, CommandType, ExecAbility, Transport, VMConfig } from '@/types';
import { Priority } from '@/constants';

import { init } from './init';
import { ping } from './ping';

const apiMethods = {
  init: init.apiExec,
  ping: ping.apiExec,
};

const commandMap: CommandMap<ExecAbility<VMConfig | null>>[] = [
  {
    type: CommandType.Ability,
    title: init.methodName,
    description: 'Request initialization of VM',
    priority: Priority.API,
    test: init.methodName,
    exec: init.exec,
    transports: [Transport.Gateway],
  },
  {
    type: CommandType.Ability,
    title: ping.methodName,
    description: 'Check VM is online',
    priority: Priority.API,
    test: ping.methodName,
    exec: ping.exec,
    transports: [Transport.VM],
  },
];

export { commandMap, apiMethods };
