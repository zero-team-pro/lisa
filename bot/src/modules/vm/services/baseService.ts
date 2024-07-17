import Dockerode from 'dockerode';
import { v4 as uuid } from 'uuid';

export abstract class BaseService {
  public docker: Dockerode;

  public abstract serviceName: string;
  public abstract imageName: string;
  public abstract imageVersions: ElementType<unknown[]>;
  public abstract version: unknown;

  public abstract portBindings: Dockerode.HostConfig['PortBindings'];
  public abstract binds: Dockerode.HostConfig['Binds'];
  public abstract env: Dockerode.ContainerCreateOptions['Env'];

  public serviceId: string | null;

  constructor(docker: Dockerode, serviceId?: string) {
    this.docker = docker;
    this.serviceId = serviceId ?? uuid().split('-').pop();
  }

  public get name() {
    if (!this.serviceId) {
      throw new Error('[Service] No serviceId');
    }

    return `${this.serviceName}-${this.serviceId}`;
  }

  public get image() {
    if (!this.version) {
      throw new Error('[Service] No version');
    }

    return `${this.imageName}:${this.version}`;
  }

  public get mountPath() {
    if (!this.serviceId) {
      throw new Error('[Service] No serviceId');
    }

    const baseMountPath = process.env.DATA_MOUNT_PATH_VM_SERVICES || `${process.env.DATA_MOUNT_PATH}/vm/services`;
    return `${baseMountPath}/${this.serviceId}`;
  }

  public getOptions() {
    const options: Dockerode.ContainerCreateOptions = {
      Image: this.image,
      name: this.name,
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      Labels: { serviceId: this.serviceId },
      Env: this.env,
      HostConfig: {
        PortBindings: this.portBindings,
        Binds: this.binds,
        RestartPolicy: {
          Name: 'unless-stopped',
        },
      },
    };

    return options;
  }

  public async createService(version: this['version']) {
    this.version = version;

    const options = this.getOptions();

    this.docker.pull(this.image).catch((err) => {
      console.log('Image pull error:', err);
    });

    return this.createContainer(options);
  }

  private async createContainer(options: Dockerode.ContainerCreateOptions) {
    return this.docker
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
  }

  public async listServices() {
    console.log(`Finding services...`);

    const containerList = await this.docker.listContainers({ all: true });

    return containerList
      .filter((container) => Boolean(container.Labels?.['serviceId']))
      .map((container) => {
        const names = container.Names.map((name) => name.replace(/^\//, '')).join(', ');
        return `• ${names} - ${container.Status}`;
      });
  }

  public async getContainer(serviceId: string = this.serviceId) {
    if (!serviceId) {
      throw new Error('[Service] No serviceId');
    }

    const containerList = await this.docker.listContainers({ all: true });

    const containerInfo = containerList.find((container) => container.Labels?.serviceId === serviceId) || null;
    const container = containerInfo ? this.docker.getContainer(containerInfo.Id) : null;

    return container;
  }

  // TODO: Catch 304 here and bellow
  public async start() {
    console.log(`Starting service ${this.serviceId}`);

    const container = await this.getContainer();

    if (container) {
      await container.start();
      return true;
    } else {
      return false;
    }
  }

  public async stop() {
    console.log(`Stopping service ${this.serviceId}`);

    const container = await this.getContainer();

    if (container) {
      await container.stop();
      return true;
    } else {
      return false;
    }
  }

  public async delete() {
    console.log(`Deleting service ${this.serviceId}`);

    const container = await this.getContainer();

    if (container) {
      await container.remove({ v: true, force: true });
      return true;
    } else {
      return false;
    }
  }

  // TODO
  private setVersion(version: this['version']) {
    this.version = version;
  }
}
