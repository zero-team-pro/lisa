import { BotModule } from '../botModule';
import { commandMap, apiMethods } from './commands';
import { BotModuleMeta, ExecAbility } from '../../types';

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
