import { MastercardData, TFunc } from '@/types';
import { fetchConversionRate } from '@/utils';
import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'rate';

const exec = async (message: BaseMessage, t: TFunc) => {
  const [, amountStr, currStr, cardCurrStr] = message.content.split(' ');

  const context = await message.getModuleData<MastercardData>('mastercard');

  const amount = Number.parseFloat(amountStr);
  const currFrom = currStr || context.transCurr;
  const currTo = cardCurrStr || context.cardCurr;
  const bankFee = context.bankFee || 0;

  if (!amount || !currFrom) {
    const builder = message.getMessageBuilder();
    builder.addFieldCode('Usage example', '/rate 500 KZT');
    return await builder.reply();
  }

  const convRes = await fetchConversionRate({ amount: amount, currFrom, currTo, bankFee });

  if (!convRes || !convRes.data || convRes.data.errorCode) {
    return await message.reply(`${convRes.data.errorMessage || convRes.data.errorCode}`);
  }

  const conv = convRes.data;

  const conversionRate =
    conv.conversionRate < 1
      ? // 1 USD / 450 KZT
        `1 ${conv.crdhldBillCurr} / ${(1 / conv.conversionRate).toFixed(2)} ${conv.transCurr}`
      : // 1.14 USD / GBP
        `${conv.conversionRate.toFixed(2)} ${conv.crdhldBillCurr} / 1 ${conv.transCurr}`;

  const builder = message.getMessageBuilder();

  builder.addBoldLine(`${conv.crdhldBillAmt.toFixed(2)} ${conv.crdhldBillCurr}`);
  builder.addEmptyLine();
  builder.addLine(`Rate: ${conversionRate}`);

  await builder.reply();
};

export const rate = { methodName, exec };
