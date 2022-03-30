import { Core } from './core';
import { Rater } from './rater';
import { BotModule } from './botModule';

export * from './botModule';

export { Core, Rater };

export const ModuleList: BotModule[] = [new Core(), new Rater()];
