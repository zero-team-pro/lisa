import { bridgeRequest } from '@/utils';
import { VMExecParams } from '@/types';

interface IParams {
  vmId: string;
}

interface IRes {
  list: string[];
}

const methodName = 'vm-findServices';

const exec = async (params: IParams, { docker }: VMExecParams): Promise<IRes> => {
  const {} = params;

  console.log(`Creating service...`);

  const containers = await docker.listContainers();

  const list = containers.map((container) => container.Names.map((name) => name.replace(/^\//, '')).join(', '));

  return { list };
};

const apiExec = (bridge, params: IParams) => {
  const { vmId } = params;

  return bridgeRequest<IRes>(bridge, `vm-${vmId}`, methodName, params);
};

export const findServices = { methodName, exec, apiExec };
