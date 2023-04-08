import { telegramBridgeRequest } from '@/utils';
import { TelegramUser } from '@/models';
import { TelegrafBot } from '@/types';
import { S3Cloud } from '@/controllers/s3';

interface IParams {
  adminId: number;
}

interface IRes {
  list: TelegramUser[];
}

const methodName = 'tg-userList';

const exec = async (params: IParams, bot: TelegrafBot): Promise<IRes> => {
  const { adminId } = params;

  let result = { list: null };

  const userList = await TelegramUser.findAll({ where: { adminId } });

  if (Array.isArray(userList)) {
    result.list = userList.map((user) => {
      return {
        ...user.toJSON(),
        avatarUrlSmall: `${S3Cloud.PUBLIC_URL}/${user.avatarUrlSmall}`,
        avatarUrlBig: `${S3Cloud.PUBLIC_URL}/${user.avatarUrlBig}`,
      };
    });
  }

  return result;
};

const apiExec = (bridge, params: IParams) => {
  return telegramBridgeRequest<IRes>(bridge, methodName, params);
};

export const userList = { methodName, exec, apiExec };
