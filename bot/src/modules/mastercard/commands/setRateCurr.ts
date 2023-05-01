import { MastercardData, TFunc } from '@/types';
import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'setRateCurr';

const exec = async (message: BaseMessage, t: TFunc) => {
  const [, cardCurrStr] = message.content.split(' ');

  // TODO: Check API
  if (cardCurrStr?.length !== 3) {
    return await message.reply('This is not an ISO currency code');
  }

  const cardCurr = cardCurrStr.toUpperCase();

  // TODO: Move to upper level
  message.setModule('mastercard');
  await message.setModuleDataPartial<MastercardData>({ cardCurr });

  const builder = message.getMessageBuilder();
  builder.addFieldInfo('Default account currency changed to', cardCurrStr);
  await builder.reply();
};

export const setRateCurr = { methodName, exec };
