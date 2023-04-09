import { telegramBridgeRequest } from '@/utils';
import { TelegramChat } from '@/models';

interface IParams {
  adminId: number;
}

interface IRes {
  list: TelegramChat[];
}

const methodName = 'tg-chatList';

const exec = async (params: IParams): Promise<IRes> => {
  const { adminId } = params;

  let result = { list: null };

  const chatList = await TelegramChat.findAll({ where: { adminId } });

  if (Array.isArray(chatList)) {
    result.list = chatList;
  }

  return result;
};

const apiExec = (bridge, params: IParams) => {
  return telegramBridgeRequest<IRes>(bridge, methodName, params);
};

export const chatList = { methodName, exec, apiExec };
