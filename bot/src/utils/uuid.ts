import { randomUUID } from 'node:crypto';

export const uuid = () => randomUUID();

export const uuidShort = () => uuid().split('-').pop();
