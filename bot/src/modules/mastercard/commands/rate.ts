import { TFunc } from '@/types';
import { TelegramMessage } from '@/controllers/telegramMessage';
import { AdminUser } from '@/models';
import { fetchConversionRate, updateTelegramUser } from '@/utils';

const methodName = 'rate';

const exec = async (message: TelegramMessage, t: TFunc) => {
  const [, amountStr, currStr, cardCurrStr] = message.content.split(' ');

  const user = await updateTelegramUser(message);

  const admin = await AdminUser.findByPk(user.adminId);

  // TODO: Save currencies
  const amount = Number.parseFloat(amountStr);
  const curr = currStr;
  const cardCurr = cardCurrStr || 'USD';
  const bankFee = 0;

  if (!amount || !currStr) {
    // TODO: Message builder
    return await message.reply(`Usage example: /rate 500 KZT`);
  }

  const convRes = await fetchConversionRate({ amount: amount, currFrom: curr, currTo: cardCurr, bankFee });

  if (!convRes || !convRes.data || convRes.data.errorCode) {
    return await message.reply(`${convRes.data.errorMessage || convRes.data.errorCode}`);
  }

  const conv = convRes.data;

  // TODO: Message builder
  let answer = `${conv.crdhldBillAmt.toFixed(2)} ${conv.crdhldBillCurr}`;

  const conversionRate =
    conv.conversionRate < 1
      ? `1 ${conv.crdhldBillCurr} / ${(1 / conv.conversionRate).toFixed(2)} ${conv.transCurr}`
      : `${conv.conversionRate.toFixed(2)} ${conv.crdhldBillCurr} / 1 ${conv.transCurr}`;

  answer += '\n' + `Rate: ${conversionRate}`;

  await message.reply(answer);
};

export const rate = { methodName, exec };
