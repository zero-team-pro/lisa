import { MastercardData } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';
import { BotError } from '@/controllers/botError';

const methodName = 'setRate';

const parseCurr = (data: string) => {
  // TODO: Check API
  if (data?.length !== 3) {
    throw new BotError('This is not an ISO currency code');
  }

  return data.toUpperCase();
};

const parseNumber = (data: string) => {
  const num = Number.parseFloat(data);

  if (isNaN(num)) {
    throw new BotError('This is not a number');
  }

  return num;
};

const exec = async (message: BaseMessage) => {
  const [, data, type] = message.content.split(' ');

  const builder = message.getMessageBuilderOld();

  if (!type || type === 'account' || type === 'card') {
    const curr = parseCurr(data);
    await message.setModuleDataPartial<MastercardData>('mastercard', { cardCurr: curr });
    builder.addFieldInfo('Default account currency changed to', curr);
    return await builder.reply();
  }

  if (type === 'trans' || type === 'transaction') {
    const curr = parseCurr(data);
    await message.setModuleDataPartial<MastercardData>('mastercard', { transCurr: curr });
    builder.addFieldInfo('Default transaction currency changed to', curr);
    return await builder.reply();
  }

  if (!type || type === 'fee' || type === 'bankFee') {
    const bankFee = parseNumber(data);
    await message.setModuleDataPartial<MastercardData>('mastercard', { bankFee });
    builder.addFieldInfo('Default account currency changed to', bankFee.toString());
    return await builder.reply();
  }
};

export const setRate = { methodName, exec };
