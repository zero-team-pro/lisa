import { BotModuleId, BotModuleMeta, CommandMap, ContextData } from '@/types';

export class BotModule<E> {
  public static title: string = 'Unknown';
  public id: BotModuleId;
  public title: string;
  public commandMap: CommandMap<E>[] = [];
  public contextData: ContextData = null;

  constructor(meta: BotModuleMeta) {
    this.id = meta.id;
    this.title = meta.title;
    console.log(`Bot module initialization: ${this.title}`);
  }
}
