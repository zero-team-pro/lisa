import got from 'got';

import { MastercardApiConversionRateRequest, MastercardConversionRate } from '@/types';
import { toSearchParams } from '@/utils/toSearchParams';

interface Props {
  currFrom: string;
  currTo: string;
  amount: number;
  bankFee?: number;
}

export const fetchConversionRate = async (props: Props) => {
  const url = 'https://www.mastercard.md/settlement/currencyrate/conversion-rate';

  const params: MastercardApiConversionRateRequest = {
    fxDate: '0000-00-00',
    crdhldBillCurr: props.currTo,
    transCurr: props.currFrom,
    transAmt: `${props.amount}`,
    bankFee: props.bankFee ? `${props.bankFee}` : '0',
  };

  const search = toSearchParams(params);

  const uri = `${url}${search}`;

  return await got.get(uri).json<MastercardConversionRate>();
};
