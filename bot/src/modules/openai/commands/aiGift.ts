import { BaseMessage } from '@/controllers/baseMessage';
import { BotError } from '@/controllers/botError';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { OpenAI } from '@/controllers/openAI';
import { Owner, OwnerType, Transport } from '@/types';
import { parseNumber } from '@/utils';

const methodName = 'aiGift';

const usageError = async (builder: MessageBuilder) => {
  builder.addFieldCode('Usage', '/aiGift [id] [amount]');
  builder.addFieldCode('Example', '/aiGift 1234567890 5');
  return builder.reply();
};

const exec = async (message: BaseMessage) => {
  const admin = await message.getAdmin();
  if (admin.role !== 'globalAdmin') {
    throw new BotError('You are not a global admin.');
  }

  const [, userId, amountString] = message.content.split(' ');

  let ownerType: OwnerType | null = null;
  if (message.transport === Transport.Discord) {
    ownerType = 'discordUser';
  }
  if (message.transport === Transport.Telegram) {
    ownerType = 'telegramUser';
  }

  if (!ownerType) {
    throw new BotError('Unsupported messanger.');
  }

  const owner: Owner = { owner: userId, ownerType };
  const amount = parseNumber(amountString);

  const builder = message.getMessageBuilder();

  if (!userId || typeof amount !== 'number' || isNaN(amount)) {
    return usageError(builder);
  }

  if (amount <= 0) {
    return message.reply('Amount should be a positive number.');
  }
  if (amount > 10) {
    return message.reply('Amount should be not more than 10.');
  }

  const aiOwner = await OpenAI.getAIOwnerFromOwner(owner);

  if (!aiOwner) {
    return message.reply('OpenAI module user with this id not found. User should use module at least once.');
  }

  try {
    const newBalance = await OpenAI.topUp(owner, amount, 'gift');

    if (typeof newBalance !== 'number' || isNaN(newBalance)) {
      return message.reply('Error to send gift. May be. May be not...');
    }

    builder.addLine(
      `The user with ID ${builder.italic(userId)} has been credited with ${builder.bold(
        `$${amount.toLocaleString('en-US')}`,
      )}, bringing the balance to ${builder.bold(`$${newBalance.toLocaleString('en-US')}`)}\\.`,
      { raw: true },
    );

    return builder.reply();
  } catch (err) {
    return message.reply('Error to send gift.');
  }
};

export const aiGift = { methodName, exec };
