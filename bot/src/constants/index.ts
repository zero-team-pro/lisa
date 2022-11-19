import { IError, RaterCostType } from '../types';

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

export const API_URL = `${process.env.API_HOST_LE ? 'https' : 'http'}://${process.env.API_HOST}`;
export const STATIC_URL = `${API_URL}/static`;

export enum Contacts {
  DISCORD_URL = 'https://discord.gg/2rvxaQWj',
  GITHUB_URL = 'https://github.com/zero-team-pro/lisa',
  IMAGE_SAMPLE_URL = 'https://cdn.discordapp.com/attachments/787533173004173343/790751503475802122/unknown.png',
}

export const EngineList = ['OCR', 'Tesseract', 'OCR+Tesseract'] as const;

export const RaterCost: RaterCostType = {
  OCR: 10,
  Tesseract: 1,
  'OCR+Tesseract': 11,
};

// type IErrorList = {
//   [key: string]: IError;
// };

export const Errors = {
  BAD_REQUEST: {
    message: 'Bad request',
    code: 400,
  },
  UNAUTHORIZED: {
    message: 'Unauthorized',
    code: 401,
  },
  FORBIDDEN: {
    message: 'Forbidden',
    code: 403,
  },
  FORBIDDEN_API: {
    message: 'Check bot privileges',
    code: 403,
  },
  NOT_FOUND: {
    message: 'Not found',
    code: 404,
  },
  UNKNOWN: {
    message: 'Server error',
    code: 500,
  },
};
