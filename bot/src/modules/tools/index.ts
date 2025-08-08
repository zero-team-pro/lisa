import { BotModule } from '@/modules/botModule';
import { BotModuleMeta, ExecCommand } from '@/types';
import { commandMap } from './commands';

class OpenAITools extends BotModule<ExecCommand> {
  public static meta: BotModuleMeta = {
    id: 'openai-tools',
    title: 'OpenAI Tools',
  };

  public commandMap = commandMap;

  constructor() {
    super(OpenAITools.meta);
  }
}

export const OpenAIToolsModule = new OpenAITools();
