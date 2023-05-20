import { BotModule } from '@/modules/botModule';
import { BotModuleMeta, ExecCommand, OpenAiGroupData } from '@/types';
import { commandMap } from './commands';

class OpenAI extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'openai',
    title: 'OpenAI',
  };

  public commandMap = commandMap;

  public contextGroupData: OpenAiGroupData = {
    version: 1,
    isGroupPay: false,
  };

  constructor() {
    super(OpenAI.meta);
  }
}

export const OpenAIModule = new OpenAI();
