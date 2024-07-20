import { VMExecParams } from '@/types';
import { gateway, VMConfigUtils } from '@/utils';

const methodName = 'vm-state';

// TODO: Update config in controller
async function exec({ config }: VMExecParams) {
  try {
    const stateUpdate = await gateway
      .post('vm/state', {
        json: { vmId: config.id, token: config.token },
        dnsLookupIpVersion: 4,
      })
      .json<{ config?: { externalIp: string } }>();
    console.log(`VM State:`, stateUpdate);

    const isUpdate = Object.keys(stateUpdate.config).some((key) => config[key] !== stateUpdate.config[key]);
    if (isUpdate) {
      VMConfigUtils.updateValue({ externalIp: stateUpdate.config.externalIp });
    }
  } catch (err) {
    console.log(`VM State error:`, err);
  }
}

export const state = { methodName, exec };
