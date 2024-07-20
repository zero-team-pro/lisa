import { v4 as uuidV4 } from 'uuid';

export const uuid = uuidV4;

export const uuidShort = () => uuid().split('-').pop();
