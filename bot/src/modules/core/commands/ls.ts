import { CommandType, TFunc } from '@/types';
import { ModuleList } from '@/modules';
import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'ls';

const exec = async (message: BaseMessage, t: TFunc) => {
  const [, param] = message.content.split(' ');
  const isGlobal = param === 'all';

  const builder = message.getMessageBuilder();

  ModuleList.map((module) => {
    builder.addBoldLine(module.title);

    const moduleList = isGlobal
      ? module.commandMap
      : module.commandMap.filter((com) => com.transports.includes(message.transport));

    moduleList.forEach((com) => {
      if (com.type === CommandType.Command && com.transports.includes(message.transport)) {
        builder.addFieldInline(com.title, com.description);
      } else {
        builder.addFieldInlineItalic(com.title, com.description);
      }
    });

    builder.addEmptyLine();
  });

  await builder.reply();
};

export const ls = { exec, methodName };
