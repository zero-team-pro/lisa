import got from 'got';

import { MastercardApiConversionRateRequest, MastercardConversionRate } from '@/types';
import { getMastercardAuthHeader } from '@/utils/getMastercardAuthHeader';
import { toSearchParams } from '@/utils/toSearchParams';

interface Props {
  currFrom: string;
  currTo: string;
  amount: number;
  bankFee?: number;
}

export const fetchConversionRate = async (props: Props) => {
  const url = 'https://sandbox.api.mastercard.com/settlement/currencyrate/conversion-rate';

  const params: MastercardApiConversionRateRequest = {
    fxDate: new Date().toISOString().substring(0, 10),
    crdhldBillCurr: props.currTo,
    transCurr: props.currFrom,
    transAmt: `${props.amount}`,
    bankFee: props.bankFee ? `${props.bankFee}` : '0',
  };

  const search = toSearchParams(params);

  const uri = `${url}${search}`;

  const authHeader = getMastercardAuthHeader(uri);

  return await got.get(uri, { headers: { Authorization: authHeader } }).json<MastercardConversionRate>();
};
