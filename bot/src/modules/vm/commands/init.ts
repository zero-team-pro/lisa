import { VMConfig } from '@/types';
import { bridgeRequest, uuid } from '@/utils';
import { VM } from '@/models/vm';

interface IParams {
  config: VMConfig;
}

interface IRes {
  token?: string;
  name?: string;
  externalIp?: string;
}

const methodName = 'vm-init';

const exec = async (params: IParams): Promise<IRes> => {
  const { config } = params;

  console.log(`VM ${config.id} init request`);

  const vm = await VM.findOne({ where: { id: config.id } });
  if (!vm) {
    const token = uuid();
    VM.create({ id: config.id, token });
    return { token: token };
  }

  return { name: vm.name, externalIp: vm.externalIp };
};

const apiExec = (bridge, params: IParams) => {
  return bridgeRequest<IRes>(bridge, 'gateway', methodName, params);
};

export const init = { methodName, exec, apiExec };
