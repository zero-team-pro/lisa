import { Telegraf } from 'telegraf';

import { TelegramMessage } from '../../../controllers/telegramMessage';
import { telegramBridgeRequest } from '../../../utils';
import { TelegramUser } from '../../../models';

interface IParams {
  adminId: number;
}

interface IRes {
  list: TelegramUser[];
}

const methodName = 'tg-userList';

const exec = async (params: IParams, bot: Telegraf<TelegramMessage>): Promise<IRes> => {
  const { adminId } = params;

  let result = { list: null };

  const userList = await TelegramUser.findAll({ where: { adminId } });

  if (Array.isArray(userList)) {
    result.list = userList;
  }

  return result;
};

const apiExec = (bridge, params: IParams) => {
  return telegramBridgeRequest<IRes>(bridge, methodName, params);
};

export const userList = { methodName, exec, apiExec };
