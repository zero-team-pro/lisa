import { Logger } from '@/controllers/logger';
import { VMExecParams } from '@/types';
import { gateway } from '@/utils';

const methodName = 'vm-state';

async function exec({ config, updateConfig }: VMExecParams) {
  try {
    const stateUpdate = await gateway
      .post('vm/state', {
        json: { vmId: config.id, token: config.token },
        dnsLookupIpVersion: 4,
      })
      .json<{ config?: { externalIp: string } }>();
    Logger.info('State', stateUpdate, 'VM');

    updateConfig(stateUpdate.config);
  } catch (err) {
    Logger.error('State error', err, 'VM');
  }
}

export const state = { methodName, exec };
