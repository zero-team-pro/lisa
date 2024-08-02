import { BaseMessage } from '@/controllers/baseMessage';
import { BotError } from '@/controllers/botError';
import { MessageBuilderMdast } from '@/controllers/messageBuilderMdast';
import { Giveaway, GiveawayUser } from '@/models';
import { Transport, UserType } from '@/types';

const methodName = 'giveawayRegister';

const usageError = async (builder: MessageBuilderMdast) => {
  builder.addFieldCode('Usage', '/giveawayRegister [id]');
  builder.addFieldCode('Example', '/giveawayRegister 1234567890');
  return builder.reply();
};

const exec = async (message: BaseMessage) => {
  const [, giveawayIdStr] = message.content.split(' ');
  const giveawayId = Number.parseInt(giveawayIdStr, 10);

  let userType: UserType | null = null;
  if (message.transport === Transport.Discord) {
    userType = 'discordUser';
  }
  if (message.transport === Transport.Telegram) {
    userType = 'telegramUser';
  }

  if (!userType) {
    throw new BotError('Unsupported messanger.');
  }

  const builder = message.getMessageBuilder();

  if (typeof giveawayId !== 'number' || isNaN(giveawayId)) {
    return usageError(builder);
  }

  const giveaway = await Giveaway.findOne({ where: { id: giveawayId } });

  if (!giveaway) {
    return message.reply('Cannot find giveaway with this ID.');
  }

  if (giveaway.status !== 'CREATED') {
    return message.reply('The giveaway registration has already finished.');
  }

  const [giveawayUser, isCreated] = await GiveawayUser.findOrCreate({
    where: { giveawayId, userId: message.fromId, userType },
  });

  if (!giveawayUser) {
    return message.reply('Unknown register error.');
  }

  if (!isCreated) {
    return message.reply('You are already registred for this giveaway.');
  }

  builder.addLineRaw([
    builder.text('You have successfully registered for giveaway '),
    builder.bold(giveaway.title),
    builder.text('.'),
  ]);

  return builder.reply();
};

export const giveawayRegister = { methodName, exec };
