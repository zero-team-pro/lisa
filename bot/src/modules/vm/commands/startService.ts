import { bridgeRequest } from '@/utils';
import { VMExecParams } from '@/types';
import { FactorioService } from '@/modules/vm/services';

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

  const service = new FactorioService(docker, serviceId);

  try {
    await service.start();
  } catch (err) {
    console.log('[Service] Catch error', err);
    return { echo: 'Unexpected error' };
  }

  const echo = `Service ${serviceId} has been started`;

  return { echo };
};

const apiExec = (bridge, params: IParams) => {
  const { vmId } = params;

  return bridgeRequest<IRes>(bridge, `vm-${vmId}`, methodName, params);
};

export const startService = { methodName, exec, apiExec };
