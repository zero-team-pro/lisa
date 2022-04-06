import { Errors } from '../constants';

export const telegramBridgeRequest = async <R = any, P = any>(bridge, method: string, params: P): Promise<R> => {
  let isChatAdmin;
  let isChatAdminParts;

  try {
    isChatAdminParts = await bridge.requestGlobal(
      {
        method,
        params,
      },
      ['telegram-0'],
    );
  } catch (err) {
    throw err?.code ? err : Errors.UNKNOWN;
  }
  if (isChatAdminParts.length !== 1) {
    throw Errors.UNKNOWN;
  }

  const reply = isChatAdminParts[0];
  if (reply?.result) {
    isChatAdmin = reply?.result;
  } else {
    throw reply?.error || Errors.UNKNOWN;
  }

  return isChatAdmin;
};
