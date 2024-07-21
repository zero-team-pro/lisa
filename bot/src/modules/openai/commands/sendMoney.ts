import { BaseMessage } from '@/controllers/baseMessage';
import { BotError } from '@/controllers/botError';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { OpenAI } from '@/controllers/openAI';
import { Owner, OwnerType, Transport } from '@/types';
import { parseNumber } from '@/utils';

const methodName = 'sendMoney';

const usageError = async (builder: MessageBuilder) => {
  builder.addFieldCode('Usage', '/sendMoney [id] [amount]');
  builder.addFieldCode('Example', '/sendMoney 1234567890 5');
  return builder.reply();
};

const exec = async (message: BaseMessage) => {
  const [, ownerId, amountString] = message.content.split(' ');

  let ownerFromType: OwnerType | null = null;
  if (message.transport === Transport.Discord) {
    ownerFromType = 'discordUser';
  }
  if (message.transport === Transport.Telegram) {
    ownerFromType = 'telegramUser';
  }

  let ownerToType: OwnerType | null = null;
  if (message.transport === Transport.Discord) {
    ownerToType = 'discordUser';
  }
  if (message.transport === Transport.Telegram) {
    ownerToType = ownerId.startsWith('-') ? 'telegramChat' : 'telegramUser';
  }

  if (!ownerToType) {
    throw new BotError('Unsupported messanger.');
  }

  const ownerFrom: Owner = { owner: message.fromId, ownerType: ownerFromType };
  const ownerTo: Owner = { owner: ownerId, ownerType: ownerToType };
  const amount = parseNumber(amountString);

  const builder = message.getMessageBuilderOld();

  if (!ownerId || typeof amount !== 'number' || isNaN(amount)) {
    return usageError(builder);
  }

  if (amount <= 0) {
    return message.reply('Amount should be a positive number.');
  }
  if (amount > 100) {
    return message.reply('Amount should be not more than 100.');
  }

  const aiOwner = await OpenAI.getAIOwnerFromOwner(ownerTo);

  if (!aiOwner) {
    return message.reply('OpenAI module owner with this id not found. Owner should use module at least once.');
  }

  try {
    const [newBalance] = await OpenAI.sendMoney(ownerFrom, ownerTo, amount);

    if (typeof newBalance !== 'number' || isNaN(newBalance)) {
      return message.reply('Error to send gift. May be. May be not...');
    }

    // TODO: Try so send message to the recipient.

    builder.addLine(
      `The owner with ID ${builder.italic(ownerId)} has been credited with ${builder.bold(
        `$${amount.toLocaleString('en-US')}`,
      )} from your balance\\.`,
      { raw: true },
    );

    return builder.reply();
  } catch (err) {
    console.log();
    if (err === BotError.BALANCE_LOW) {
      throw err;
    }
    return message.reply('Error to send gift.');
  }
};

export const sendMoney = { methodName, exec };
