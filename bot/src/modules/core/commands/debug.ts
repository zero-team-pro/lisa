import { CommandAttributes, TFunc, Transport } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'debug';

const exec = async (message: BaseMessage, t: TFunc, attr: CommandAttributes) => {
  const builder = message.getMessageBuilder();

  if (message.transport === Transport.Discord && attr && attr.server) {
    const { server } = attr;
    const discordDebug = `Server JSON: ${JSON.stringify(server.toJSON())}. Channels: ${typeof server.channels} ${
      server.channels
    }`;

    builder.addLine(discordDebug);
  }

  if (message.transport === Transport.Telegram) {
    const telegramMessage = (message as BaseMessage<Transport.Telegram>).raw;

    const chatId = telegramMessage.message.chat.id;
    const chatType = telegramMessage.chat.type;
    const membersCount = await telegramMessage.telegram.getChatMembersCount(chatId);

    builder.addFieldCode('Chat id', chatId.toString());
    builder.addFieldCode('Chat type', chatType);
    builder.addFieldCode('Members count', membersCount.toString());
  }

  builder.addEmptyLine();

  builder.addFieldCode('Context owner', JSON.stringify(message.getContextOwner()));
  builder.addFieldCode('Context owner group', JSON.stringify(message.getContextOwnerGroup()));

  return await builder.reply();
};

export const debug = { exec, methodName };
