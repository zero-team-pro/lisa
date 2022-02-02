import { RaterCostType } from '../types';

export enum Language {
  English = 'en',
  Russian = 'ru',
}

export enum HelpStats {
  HP = 'hp',
  HP_P = 'hp%',
  DEF = 'def',
  DEF_P = 'def%',
  ATK = 'atk',
  ATK_P = 'atk%',
  ER = 'er',
  EM = 'em',
  PHYS = 'phys',
  ELEM = 'elem',
  CR = 'cr',
  CD = 'cd',
  HEAL = 'heal',
}

export enum Contacts {
  DISCORD_URL = 'https://discord.gg/2rvxaQWj',
  GITHUB_URL = 'https://github.com/SemperPeritus/Genshin-Artifact-Rater',
  IMAGE_SAMPLE_URL = 'https://cdn.discordapp.com/attachments/787533173004173343/790751503475802122/unknown.png',
}

export const EngineList = ['OCR', 'Tesseract', 'OCR+Tesseract'] as const;

export const RaterCost: RaterCostType = {
  OCR: 10,
  Tesseract: 1,
  'OCR+Tesseract': 11,
};

export const Errors = {
  BAD_REQUEST: {
    message: 400,
    code: 400,
  },
  UNAUTHORIZED: {
    message: 401,
    code: 401,
  },
  FORBIDDEN: {
    message: 403,
    code: 403,
  },
  NOT_FOUND: {
    message: 404,
    code: 404,
  },
  UNKNOWN: {
    message: 500,
    code: 500,
  },
};
