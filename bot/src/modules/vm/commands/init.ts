import { VMConfig } from '@/types';
import { bridgeRequest } from '@/utils';

interface IParams {
  config: VMConfig;
}

interface IRes {
  list: string[];
}

const methodName = 'vm-init';

const exec = async (params: IParams): Promise<IRes> => {
  const { config } = params;

  console.log(`Hello, ${config.id}!`);

  let result = { list: [`Hello, ${config.id}!`] };

  return result;
};

const apiExec = (bridge, params: IParams) => {
  return bridgeRequest<IRes>(bridge, 'gateway', methodName, params);
};

export const init = { methodName, exec, apiExec };
