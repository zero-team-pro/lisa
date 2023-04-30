import { TFunc } from '@/types';
import { TelegramMessage } from '@/controllers/telegramMessage';
import { fetchConversionRate } from '@/utils';

const methodName = 'rate';

const exec = async (message: TelegramMessage, t: TFunc) => {
  const [, amountStr, currStr, cardCurrStr] = message.content.split(' ');

  // TODO: Save currencies to module DB
  const amount = Number.parseFloat(amountStr);
  const curr = currStr;
  const cardCurr = cardCurrStr || 'USD';
  const bankFee = 0;

  if (!amount || !currStr) {
    return await message.replyWithMarkdownV2(`Usage example: \`/rate 500 KZT\``);
  }

  const convRes = await fetchConversionRate({ amount: amount, currFrom: curr, currTo: cardCurr, bankFee });

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
