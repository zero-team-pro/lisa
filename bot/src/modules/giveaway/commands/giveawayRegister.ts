import { BaseMessage } from '@/controllers/baseMessage';
import { BotError } from '@/controllers/botError';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { Giveaway, GiveawayUser } from '@/models';
import { OwnerType, Transport } from '@/types';

const methodName = 'giveawayRegister';

const usageError = async (builder: MessageBuilder) => {
  builder.addFieldCode('Usage', '/giveawayRegister [id]');
  builder.addFieldCode('Example', '/giveawayRegister 1234567890');
  return builder.reply();
};

const exec = async (message: BaseMessage) => {
  const [, giveawayIdStr] = message.content.split(' ');
  const giveawayId = Number.parseInt(giveawayIdStr, 10);

  let userType: OwnerType | null = null;
  if (message.transport === Transport.Discord) {
    userType = 'discordUser';
  }
  if (message.transport === Transport.Telegram) {
    userType = 'telegramUser';
  }

  if (!userType) {
    throw new BotError('Unsupported messanger.');
  }

  const builderOld = message.getMessageBuilderOld();

  if (typeof giveawayId !== 'number' || isNaN(giveawayId)) {
    return usageError(builderOld);
  }

  const giveaway = await Giveaway.findOne({ where: { id: giveawayId } });

  if (!giveaway) {
    return message.reply('Cannot find giveaway with this ID.');
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

  const builder = message.getMessageBuilder();

  builder.addLineRaw([
    builder.text('You have successfully registered for giveaway '),
    builder.bold(giveaway.title),
    builder.text('.'),
  ]);

  return builder.reply();
};

export const giveawayRegister = { methodName, exec };
