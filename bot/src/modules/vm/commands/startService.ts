import { bridgeRequest } from '@/utils';
import { VMExecParams } from '@/types';

interface IParams {
  vmId: string;
  serviceId: string;
}

interface IRes {
  echo: string;
}

const methodName = 'vm-startService';

const exec = async (params: IParams, { docker }: VMExecParams): Promise<IRes> => {
  const { serviceId } = params;

  console.log(`Starting service ${serviceId}`);

  const containerList = await docker.listContainers({ all: true });

  const containerInfo = containerList.find((container) => container.Labels?.serviceId === serviceId) || null;
  const container = containerInfo ? docker.getContainer(containerInfo.Id) : null;

  let echo = '';
  if (container) {
    await container.start();
    echo = `Service ${serviceId} has been started`;
  } else {
    echo = `Cannot find service ${serviceId}`;
  }

  return { echo };
};

const apiExec = (bridge, params: IParams) => {
  const { vmId } = params;

  return bridgeRequest<IRes>(bridge, `vm-${vmId}`, methodName, params);
};

export const startService = { methodName, exec, apiExec };
