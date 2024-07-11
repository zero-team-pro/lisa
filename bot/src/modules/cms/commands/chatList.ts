import { bridgeRequest } from '@/utils';
import { TelegramChat } from '@/models';
import { S3Cloud } from '@/controllers/s3';

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
    result.list = chatList.map((chat) => ({
      ...chat.toJSON(),
      photoUrl: `${S3Cloud.PUBLIC_URL}/${chat.photoUrl}`,
    }));
  }

  return result;
};

const apiExec = (bridge, params: IParams) => {
  return bridgeRequest<IRes>(bridge, 'telegram-0', methodName, params);
};

export const chatList = { methodName, exec, apiExec };
