import { CommandType, Transport } from '@/types';
import { ModuleList } from '@/modules';
import { BaseMessage } from '@/controllers/baseMessage';
import { MessageBuilder } from '@/controllers/messageBuilder';

const methodName = 'ls';

const TypeSign: Record<CommandType, string> = {
  command: '🧰',
  ability: '🧪',
};

const TransportSign: Record<Transport, string> = {
  discord: '🎮',
  telegram: '✈️',
};

const addFooter = (builder: MessageBuilder, isGlobal: boolean) => {
  builder.addField(TypeSign.command, 'Command');
  builder.addField(TypeSign.ability, 'Ability (not runnable by user)');

  if (isGlobal) {
    builder.addEmptyLine();
    builder.addField(TransportSign.discord, 'Discord');
    builder.addField(TransportSign.telegram, 'Telegram');
  }
};

const exec = async (message: BaseMessage) => {
  const [, param] = message.content.split(' ');
  const isGlobal = param === 'all';

  const builder = message.getMessageBuilder();

  ModuleList.map((module) => {
    const moduleList = isGlobal
      ? module.commandMap
      : module.commandMap.filter((com) => com.transports.includes(message.transport));

    if (moduleList.length === 0) {
      return;
    }

    builder.addBoldLine(module.title);

    moduleList.forEach((com) => {
      const transports = isGlobal ? `${com.transports.map((tr) => TransportSign[tr]).join('')}  ` : '';
      const title = `${transports}${TypeSign[com.type]}  ${com.title}`;

      if (com.type === CommandType.Command && com.transports.includes(message.transport)) {
        builder.addField(title, com.description);
      } else {
        builder.addFieldItalic(title, com.description);
      }
    });

    builder.addEmptyLine();
  });

  addFooter(builder, isGlobal);

  await builder.reply();
};

export const ls = { exec, methodName };
