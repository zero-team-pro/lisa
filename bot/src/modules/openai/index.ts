import { BotModule } from '@/modules/botModule';
import { BotModuleMeta, ExecCommand, OpenAiData } from '@/types';
import { commandMap } from './commands';

class OpenAI extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'openai',
    title: 'OpenAI',
  };

  public commandMap = commandMap;

  public contextData: OpenAiData = {
    version: 1,
  };

  constructor() {
    super(OpenAI.meta);
  }
}

export const OpenAIModule = new OpenAI();
