import Dockerode from 'dockerode';

import { BaseService } from './baseService';

export class FactorioService extends BaseService {
  public serviceName: string = 'factorio';
  public imageName: string = 'factoriotools/factorio';
  public imageVersions = ['1.1.109'] as const;
  public version: FactorioService['imageVersions'][number];

  public portBindings = {
    '34197/udp': [{ HostPort: '34197' }],
    '27015/tcp': [{ HostPort: '27015' }],
  };
  public binds = [`${this.mountPath}:/factorio`];
  public env = ['LOAD_LATEST_SAVE=false', 'GENERATE_NEW_SAVE=true', 'SAVE_NAME=save1'];

  constructor(docker: Dockerode, serviceId?: string) {
    super(docker, serviceId);
  }
}
