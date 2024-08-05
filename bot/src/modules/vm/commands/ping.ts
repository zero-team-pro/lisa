import { bridgeRequest } from '@/utils';

interface IParams {
  vmId: string;
}

interface IRes {
  reply: 'Pong!';
}

const methodName = 'vm-ping';

const exec = async (): Promise<IRes> => {
  return { reply: 'Pong!' };
};

const apiExec = (bridge, params: IParams) => {
  const { vmId } = params;

  return bridgeRequest<IRes>(bridge, `vm-${vmId}`, methodName, params);
};

export const ping = { methodName, exec, apiExec };
