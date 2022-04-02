import { Core } from './core';
import { Rater } from './rater';
import { BotModule } from './botModule';
import { CMS } from './cms';

export * from './botModule';

export { Core, Rater, CMS };

export const ModuleList: BotModule<any>[] = [new Core(), new Rater(), new CMS()];
