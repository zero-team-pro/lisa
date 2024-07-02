import { Message as TelegrafMessage } from '@telegraf/types';

import { Transport } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';
import { DiscordMessage } from '@/controllers/discord/discordMessage';

const methodName = 'debug';

const exec = async (message: BaseMessage) => {
  const builder = message.getMessageBuilder();

  if (message.transport === Transport.Discord) {
    const { server } = message as DiscordMessage;
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

    const images = await message.images;
    if (images) {
      builder.addFieldCode('Images', images.join('\n'));
    }

    const replyMessage = (telegramMessage.message as TelegrafMessage.TextMessage).reply_to_message;

    builder.addFieldCode('Reply to', JSON.stringify(replyMessage));
  }

  builder.addEmptyLine();

  builder.addFieldCode('Context owner', JSON.stringify(message.getContextOwner()));
  builder.addFieldCode('Context owner group', JSON.stringify(message.getContextOwnerGroup()));

  return await builder.reply();
};

export const debug = { exec, methodName };
