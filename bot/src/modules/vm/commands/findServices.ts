import { bridgeRequest } from '@/utils';
import { VMExecParams } from '@/types';
import { FactorioService } from '@/modules/vm/services';

interface IParams {
  vmId: string;
}

interface IRes {
  list: string[];
}

const methodName = 'vm-findServices';

const exec = async (params: IParams, { docker }: VMExecParams): Promise<IRes> => {
  const {} = params;

  const service = new FactorioService(docker);

  const list = await service.listServices();

  return { list };
};

const apiExec = (bridge, params: IParams) => {
  const { vmId } = params;

  return bridgeRequest<IRes>(bridge, `vm-${vmId}`, methodName, params);
};

export const findServices = { methodName, exec, apiExec };
