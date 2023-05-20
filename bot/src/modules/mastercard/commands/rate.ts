import { MastercardData, TFunc } from '@/types';
import { fetchConversionRate, parseNumber } from '@/utils';
import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'rate';

const usageError = async (message: BaseMessage) => {
  const builder = message.getMessageBuilder();
  builder.addHeader('Usage examples');
  builder.addFieldCode('Rate from default account currency', '/rate 500 KZT');
  builder.addFieldCode('View rate', '/rate KZT EUR');
  return await builder.reply();
};

const exec = async (message: BaseMessage, t: TFunc) => {
  const [, first, second, third] = message.content.split(' ');

  const context = await message.getModuleData<MastercardData>('mastercard');

  const amount = parseNumber(first);

  const isTransaction = amount && second?.length === 3;
  const isRatePossible = first?.length === 3;

  if (!isTransaction && !isRatePossible) {
    return usageError(message);
  }

  const currFrom = (isTransaction ? second : first) || context.transCurr;
  const currTo = (isTransaction ? third : second) || context.cardCurr;
  const bankFee = isTransaction ? context.bankFee : 0;

  const convRes = await fetchConversionRate({ amount: amount || 1, currFrom, currTo, bankFee });

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

  if (isTransaction) {
    // TODO: Use message lang
    const billed = `${conv.crdhldBillAmt.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${conv.crdhldBillCurr}`;
    const trans = `${conv.transAmt.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${conv.transCurr}`;
    builder.addLine(`${builder.bold(billed)} for ${builder.italic(trans)}`, { raw: true });
  }

  builder.addLine(`Rate: ${conversionRate}`);

  await builder.reply();
};

export const rate = { methodName, exec };
