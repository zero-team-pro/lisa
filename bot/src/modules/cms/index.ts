import { BotModule } from '../botModule';
import { commandMap } from './commands';
import { BotModuleMeta, ExecAbility } from '../../types';

export class CMS extends BotModule<ExecAbility> {
  public static meta: BotModuleMeta = {
    id: 'cms',
    title: 'CMS',
  };

  public commandMap = commandMap;

  constructor() {
    super(CMS.meta);
  }
}
