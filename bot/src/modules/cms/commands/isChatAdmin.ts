import { Errors } from '@/constants';
import { bridgeRequest } from '@/utils';
import { TelegrafBot } from '@/types';

interface IParams {
  chatId: string | number;
  userId: number;
}

interface IRes {
  chatId: string | number;
  userId: number;
  isAdmin: boolean;
}

const methodName = 'tg-isChatAdmin';

const exec = async (params: IParams, bot: TelegrafBot): Promise<IRes> => {
  // TODO: +Url parse
  const { chatId, userId } = params;

  let result = { chatId, userId, isAdmin: false };

  try {
    const chat = await bot.telegram.getChat(chatId);
    const chatAdminList = await bot.telegram.getChatAdministrators(chatId);

    if (chat && chatAdminList) {
      chatAdminList?.map((admin) => {
        if (admin?.user?.id === userId) {
          result.isAdmin = true;
        }
      });
    }
  } catch (err) {
    throw Errors.UNKNOWN;
  }

  return result;
};

const apiExec = (bridge, params: IParams) => {
  return bridgeRequest<IRes>(bridge, 'telegram-0', methodName, params);
};

export const isChatAdmin = { methodName, exec, apiExec };
