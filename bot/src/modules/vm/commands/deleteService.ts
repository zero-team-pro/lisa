import { bridgeRequest } from '@/utils';
import { VMExecParams } from '@/types';

interface IParams {
  vmId: string;
}

interface IRes {
  echo: string;
}

const methodName = 'vm-deleteService';

// TODO
const exec = async (params: IParams, { docker }: VMExecParams): Promise<IRes> => {
  const {} = params;

  console.log(`Starting service`);

  const containers = await docker.listContainers();

  const echo = containers.map((container) => container.Names.join(', ')).join(';\n');

  return { echo };
};

const apiExec = (bridge, params: IParams) => {
  const { vmId } = params;

  return bridgeRequest<IRes>(bridge, `vm-${vmId}`, methodName, params);
};

export const deleteService = { methodName, exec, apiExec };
