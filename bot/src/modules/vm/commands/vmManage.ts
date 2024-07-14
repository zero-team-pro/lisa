import { BaseMessage } from '@/controllers/baseMessage';
import { VMModule } from '@/modules/vm';

const methodName = 'vm';

const exec = async (message: BaseMessage) => {
  const [, vmId, action, ...params] = message.content.split(' ');

  message.startTyping();

  let reply: string;

  if (action === 'find') {
    const { list } = await VMModule.api.findServices(message.bridge, { vmId });
    reply = list.join('\n');
  }

  if (action === 'create') {
    const result = await VMModule.api.createService(message.bridge, { vmId });
    reply = result.echo;
  }

  if (action === 'start') {
    const result = await VMModule.api.startService(message.bridge, { vmId });
    reply = result.echo;
  }

  if (action === 'stop') {
    const result = await VMModule.api.stopService(message.bridge, { vmId });
    reply = result.echo;
  }

  if (action === 'delete') {
    const result = await VMModule.api.deleteService(message.bridge, { vmId });
    reply = result.echo;
  }

  await message.reply(reply || 'Empty result');
};

export const vmManage = { methodName, exec };
