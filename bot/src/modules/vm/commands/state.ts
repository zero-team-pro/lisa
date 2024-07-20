import { VMExecParams } from '@/types';
import { gateway, VMConfigUtils } from '@/utils';

const methodName = 'vm-state';

// TODO: Update config in controller
async function exec({ config, updateConfig }: VMExecParams) {
  try {
    const stateUpdate = await gateway
      .post('vm/state', {
        json: { vmId: config.id, token: config.token },
        dnsLookupIpVersion: 4,
      })
      .json<{ config?: { externalIp: string } }>();
    console.log(`VM State:`, stateUpdate);

    updateConfig(stateUpdate.config);
  } catch (err) {
    console.log(`VM State error:`, err);
  }
}

export const state = { methodName, exec };
