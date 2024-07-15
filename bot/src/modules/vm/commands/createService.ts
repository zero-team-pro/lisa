import Dockerode from 'dockerode';
import { v4 as uuid } from 'uuid';

import { bridgeRequest } from '@/utils';
import { VMExecParams } from '@/types';

interface IParams {
  vmId: string;
}

interface IRes {
  echo: string;
}

const methodName = 'vm-createService';

const createContainer = async (docker: Dockerode, options: Dockerode.ContainerCreateOptions) => {
  return docker
    .createContainer(options)
    .then(async (res) => {
      console.log(`Conteiner created: ${res.id}`);
      const startResult = res.start();
      console.log(`Conteiner started: ${res.id}`);
      return startResult;
    })
    .catch((err) => {
      console.log('Continer creating error:', err);
    });
};

const exec = async (params: IParams, { docker }: VMExecParams): Promise<IRes> => {
  const {} = params;

  console.log(`Creating service...`);

  const serviceId = uuid().split('-').pop();

  const imageName = 'factoriotools/factorio:1.1.109';
  const name = `factorio-${serviceId}`;
  const mountPath = `${process.env.DATA_MOUNT_PATH}/vm/services/${serviceId}`;

  const options: Dockerode.ContainerCreateOptions = {
    Image: imageName,
    name,
    AttachStdin: false,
    AttachStdout: true,
    AttachStderr: true,
    Tty: false,
    Labels: { serviceId },
    Env: ['LOAD_LATEST_SAVE=false', 'GENERATE_NEW_SAVE=true', 'SAVE_NAME=save1'],
    HostConfig: {
      PortBindings: {
        '34197/udp': [{ HostPort: '34197' }],
        '27015/tcp': [{ HostPort: '27015' }],
      },
      Binds: [`${mountPath}:/factorio`],
      RestartPolicy: {
        Name: 'unless-stopped',
      },
    },
  };

  docker
    .pull(imageName)
    .then(() => createContainer(docker, options))
    .catch((err) => {
      console.log('Image pull error:', err);
    });

  const echo = `Service created with ID ${serviceId}`;

  return { echo };
};

const apiExec = (bridge, params: IParams) => {
  const { vmId } = params;

  return bridgeRequest<IRes>(bridge, `vm-${vmId}`, methodName, params);
};

export const createService = { methodName, exec, apiExec };
