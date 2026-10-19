import { deliverNexusVideo } from '@/services/nexusTaskVideo';
import type { TelegrafBot } from '@/types';
export const nexusVideo = {
  methodName: 'tg-nexus-video',
  exec: async (params: Parameters<typeof deliverNexusVideo>[0], bot: TelegrafBot) => {
    try {
      return await deliverNexusVideo(params, bot);
    } catch {
      return { state: 'uncertain' };
    }
  },
};
