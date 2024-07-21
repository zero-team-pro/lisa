import { BaseMessage } from '@/controllers/baseMessage';
import { VM } from '@/models';
import { VMModule } from '@/modules/vm';

const methodName = 'vm';

const exec = async (message: BaseMessage) => {
  const [, vmId, action, serviceId, ...params] = message.content.split(' ');

  message.startTyping();

  let reply: string;

  if (vmId === 'list') {
    const vmList = await VM.findAll();
    const builder = message.getMessageBuilder();

    vmList.forEach((vm) => {
      builder.addFieldsParagraph(vm.name || vm.id, [
        [
          { type: 'text', value: 'IP: ' },
          { type: 'inlineCode', value: vm.externalIp ?? 'unknown' },
        ],
        ['State', 'unknown'],
      ]);
      builder.addEmptyLine();
    });

    return builder.reply();
  }

  if (action === 'find') {
    const { list } = await VMModule.api.findServices(message.bridge, { vmId });
    reply = list.join('\n');
  }

  if (action === 'create') {
    const result = await VMModule.api.createService(message.bridge, { vmId });
    reply = result.echo;
  }

  if (action === 'start') {
    const result = await VMModule.api.startService(message.bridge, { vmId, serviceId });
    reply = result.echo;
  }

  if (action === 'stop') {
    const result = await VMModule.api.stopService(message.bridge, { vmId, serviceId });
    reply = result.echo;
  }

  if (action === 'delete') {
    const result = await VMModule.api.deleteService(message.bridge, { vmId, serviceId });
    reply = result.echo;
  }

  await message.reply(reply || 'Empty result');
};

export const vmManage = { methodName, exec };
