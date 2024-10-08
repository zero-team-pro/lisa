import { Priority } from '@/constants';
import { CommandMap, CommandType, CronAbility, ExecAbility, ExecCommand, Transport, VMExecParams } from '@/types';

import { init } from './init';
import { state } from './state';
import { ping } from './ping';
import { vmManage } from './vmManage';
import { findServices } from './findServices';
import { createService } from './createService';
import { startService } from './startService';
import { stopService } from './stopService';
import { deleteService } from './deleteService';

const apiMethods = {
  init: init.apiExec,
  ping: ping.apiExec,
  findServices: findServices.apiExec,
  createService: createService.apiExec,
  startService: startService.apiExec,
  stopService: stopService.apiExec,
  deleteService: deleteService.apiExec,
};

const commandMap: CommandMap<ExecCommand | ExecAbility<VMExecParams | null> | CronAbility<VMExecParams | null>>[] = [
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
    type: CommandType.Cron,
    title: state.methodName,
    description: 'Send state to Gateway',
    priority: Priority.CRON,
    // Every 1 minutes
    test: '0 */1 * * * *',
    exec: state.exec,
    transports: [Transport.VM],
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
  {
    type: CommandType.Command,
    title: vmManage.methodName,
    description: 'Manage VM',
    priority: Priority.COMMAND,
    test: vmManage.methodName,
    exec: vmManage.exec,
    transports: [Transport.Telegram],
  },
  {
    type: CommandType.Ability,
    title: findServices.methodName,
    description: 'Find services',
    priority: Priority.API,
    test: findServices.methodName,
    exec: findServices.exec,
    transports: [Transport.VM],
  },
  {
    type: CommandType.Ability,
    title: createService.methodName,
    description: 'Create service',
    priority: Priority.API,
    test: createService.methodName,
    exec: createService.exec,
    transports: [Transport.VM],
  },
  {
    type: CommandType.Ability,
    title: startService.methodName,
    description: 'Start service',
    priority: Priority.API,
    test: startService.methodName,
    exec: startService.exec,
    transports: [Transport.VM],
  },
  {
    type: CommandType.Ability,
    title: stopService.methodName,
    description: 'Stop service',
    priority: Priority.API,
    test: stopService.methodName,
    exec: stopService.exec,
    transports: [Transport.VM],
  },
  {
    type: CommandType.Ability,
    title: deleteService.methodName,
    description: 'Delete service',
    priority: Priority.API,
    test: deleteService.methodName,
    exec: deleteService.exec,
    transports: [Transport.VM],
  },
];

export { apiMethods, commandMap };
