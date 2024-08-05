import { Bridge } from '@/controllers/bridge';

import { Errors } from '../constants';
import { IJsonResponse } from '@/types';

export const bridgeRequest = async <R = any, P = any>(
  bridge: Bridge,
  channel: string,
  method: string,
  params: P,
): Promise<R> => {
  let result;
  let response: IJsonResponse[];

  try {
    response = await bridge.requestGlobal(
      {
        method,
        params,
      },
      [channel],
    );
  } catch (err) {
    // throw err?.code ? err : Errors.UNKNOWN;
    console.error('request error', err);
    throw err;
  }
  if (response.length !== 1) {
    console.error('response.length !== 1');
    throw Errors.UNKNOWN;
  }

  const reply = response[0];
  if (reply?.result) {
    result = reply?.result;
  } else {
    console.error('reply without a result', reply?.error || Errors.UNKNOWN);
    throw reply?.error || Errors.UNKNOWN;
  }

  return result;
};
