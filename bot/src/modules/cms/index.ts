import { BotModuleMeta, ExecAbility } from '@/types';
import { BotModule } from '@/modules/botModule';
import { apiMethods, commandMap } from './commands';

class CMS extends BotModule<ExecAbility> {
  public static meta: BotModuleMeta = {
    id: 'cms',
    title: 'CMS',
  };

  public api = apiMethods;

  public commandMap = commandMap;

  constructor() {
    super(CMS.meta);
  }
}

export const CmsModule = new CMS();
