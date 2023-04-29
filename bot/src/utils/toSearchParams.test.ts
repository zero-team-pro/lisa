import { toSearchParams } from '@/utils/toSearchParams';

export const todoTest = () => {
  const expected = '?fxDate=2023-04-28&transCurr=KZT&crdhldBillCurr=USD&bankFee=0&transAmt=4990';
  const params = { fxDate: '2023-04-28', transCurr: 'KZT', crdhldBillCurr: 'USD', bankFee: 0, transAmt: 4990 };

  const search = toSearchParams(params);

  return search === expected;
};
