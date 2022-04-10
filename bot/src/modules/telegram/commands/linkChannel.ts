import { TFunc } from '../../../types';
import { TelegramMessage } from '../../../controllers/telegramMessage';
import { TelegramChat } from '../../../models';

const methodName = 'linkChannel';

const exec = async (message: TelegramMessage, t: TFunc) => {
  const [, channel] = message.content.split(' ');
  const admin = await message.getAdmin();

  if (!admin) {
    return message.reply(t('adminNotLinked'));
  }

  const channelNameRegExp = /^@(?<name>\w+)$/;
  const channelIdRegExp = /^(?<id>-?\d+)$/;
  const channelLinkRegExp = /^https?:\/\/t\.me\/(?<link>[\w]+)\/?$/;

  const channelName = channel.match(channelNameRegExp)?.groups?.name;
  const channelId = channel.match(channelIdRegExp)?.groups?.id;
  const channelLink = channel.match(channelLinkRegExp)?.groups?.link;

  let chatId: number | string;
  if (channelName) {
    chatId = `@${channelName}`;
  }
  if (channelId) {
    chatId = Number.parseInt(channelId, 10);
  }
  if (channelLink) {
    chatId = `@${channelLink}`;
  }

  try {
    if (chatId) {
      const chat = await message.telegram.getChat(chatId);

      if (chat) {
        const telegramUser = await message.getUser();

        const chatDefaults = {
          id: chat.id,
          type: chat.type,
          username: null,
          title: null,
          description: null,
          // TODO
          photoUrl: null,
          adminId: admin.id,
          lang: telegramUser.lang,
        };

        // TODO: Types
        if ('username' in chat) {
          chatDefaults.username = chat.username;
        }
        if ('title' in chat) {
          chatDefaults.title = chat.title;
        }
        if ('description' in chat) {
          chatDefaults.description = chat.description;
        }

        const [telegramChat] = await TelegramChat.findOrCreate({
          where: { id: chat.id },
          defaults: chatDefaults,
        });

        const chatName = telegramChat.username ? `@${telegramChat.username}` : telegramChat.title || telegramChat.id;

        return await message.reply(`Chat ${chatName} linked to admin with ID: ${admin.id}`);
      }
    }
  } catch (err) {
    console.log(err);
  }

  return message.reply(
    `Can't find public channel or chat ${channel}.\nCheck usage and bot privileges in chat or channel.`,
  );
};

export const linkChannel = { methodName, exec };
