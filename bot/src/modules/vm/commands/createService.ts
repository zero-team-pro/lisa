import Dockerode from 'dockerode';

import { bridgeRequest } from '@/utils';
import { VMExecParams } from '@/types';
import { FactorioService } from '@/modules/vm/services';

interface IParams {
  vmId: string;
}

interface IRes {
  echo: string;
}

const methodName = 'vm-createService';

const exec = async (params: IParams, { docker }: VMExecParams): Promise<IRes> => {
  const {} = params;

  console.log(`Creating service...`);

  const service = new FactorioService(docker);
  service.createService('1.1.109');

  const echo = `Service created with ID ${service.serviceId}`;

  return { echo };
};

const apiExec = (bridge, params: IParams) => {
  const { vmId } = params;

  return bridgeRequest<IRes>(bridge, `vm-${vmId}`, methodName, params);
};

export const createService = { methodName, exec, apiExec };
